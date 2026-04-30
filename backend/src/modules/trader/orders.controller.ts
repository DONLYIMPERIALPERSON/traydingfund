import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Prisma, type Order, type CTraderAccount } from '@prisma/client'
import { env } from '../../config/env'
import { ApiError } from '../../common/errors'
import { createVirtualAccount } from '../../services/safehaven.service'
import { getFxRatesConfig } from '../fxRates/fxRates.service'
import { pushActiveAccountRemove } from '../../services/ctraderEngine.service'
import { requestAccountAccess } from '../../services/accessEngine.service'
import { assignReadyAccountFromPool, buildBaseChallengeId, normalizeChallengeBase } from '../ctrader/ctrader.assignment'
import { createOnboardingCertificate } from '../../services/certificate.service'
import { buildObjectiveFields } from '../ctrader/ctrader.objectives'
import { fetchRemoteAttachment, sendUnifiedEmail } from '../../services/email.service'
import { applyCouponToOrder, redeemCouponForCompletedOrder } from '../../services/coupon.service'
import { buildCacheKey, clearCacheByPrefix } from '../../common/cache'
import { sendEmailOnce } from '../../services/emailLog.service'

const CRYPTO_ADDRESSES = {
  BTC: env.cryptoBtcAddress,
  ETH: env.cryptoEthAddress,
  SOL: env.cryptoSolAddress,
  TRX: env.cryptoTrxAddress,
  USDT: '',
}

const resolveCryptoAddress = (currency: keyof typeof CRYPTO_ADDRESSES) => {
  if (currency === 'USDT') {
    return env.cryptoEthAddress || env.cryptoSolAddress || env.cryptoTrxAddress
  }
  return CRYPTO_ADDRESSES[currency]
}

const isNgnChallengeType = (challengeType?: string | null) => {
  const normalized = String(challengeType ?? '').toLowerCase()
  return normalized.includes('ngn') || normalized === 'attic' || normalized === 'breezy'
}

const isUsdChallengeType = (challengeType?: string | null) => {
  const normalized = String(challengeType ?? '').toLowerCase()
  return ['two_step', 'one_step', 'instant_funded'].includes(normalized)
}

const assertChallengeTypePurchasable = (challengeType?: string | null) => {
  if (!env.enableUsdChallenges && isUsdChallengeType(challengeType)) {
    throw new ApiError('USD challenge purchases are temporarily unavailable', 403)
  }
}

const resolveAffiliateCommissionAmountKobo = (order: { netAmountKobo: number; currency?: string | null; challengeType?: string | null }, usdNgnRate: number) => {
  if (String(order.challengeType ?? '').toLowerCase() === 'attic') {
    return 30000
  }

  const commissionBaseKobo = toUsdKobo(order.netAmountKobo, order.currency, usdNgnRate)
  return Math.round(commissionBaseKobo * (AFFILIATE_COMMISSION_PERCENT / 100))
}

const assignReadyAccount = async (
  userId: number,
  payload: { challengeType: string; phase: string; accountSize: string; currency?: string; platform?: string; baseChallengeId?: string },
) => assignReadyAccountFromPool({
  userId,
  challengeType: payload.challengeType,
  phase: payload.phase,
  accountSize: payload.accountSize,
  currency: payload.currency ?? 'USD',
  platform: payload.platform ?? 'ctrader',
  ...(payload.baseChallengeId ? { baseChallengeId: payload.baseChallengeId } : {}),
})

const maybeBurnAccount = async (accountId: number) => {
  await prisma.cTraderAccount.update({
    where: { id: accountId },
    data: { status: 'burned' },
  })
}

const burnStatuses = new Set(['failed', 'violated', 'breached', 'completed', 'passed'])
const AFFILIATE_COMMISSION_PERCENT = 30

const toUsdKobo = (amountKobo: number, currency?: string | null, rate?: number) => {
  if (currency?.toUpperCase() === 'NGN') {
    const divider = rate && rate > 0 ? rate : 1300
    const amount = amountKobo / 100
    return Math.round((amount / divider) * 100)
  }
  return amountKobo
}

const createAffiliateCommission = async (
  tx: Prisma.TransactionClient,
  order: { id: number; affiliateId?: number | null; netAmountKobo: number; currency?: string | null }
) => {
  const resolvedAffiliateId = order.affiliateId ?? null
  if (!resolvedAffiliateId) return

  const affiliateCommissionClient = (tx as typeof prisma).affiliateCommission
  const existing = await affiliateCommissionClient.findFirst({
    where: { orderId: order.id },
  })

  if (existing) return

  const fxConfig = await getFxRatesConfig()
  const usdNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
  const commissionAmount = resolveAffiliateCommissionAmountKobo(order, usdNgnRate)

  await affiliateCommissionClient.create({
    data: {
      orderId: order.id,
      affiliateId: resolvedAffiliateId,
      amountKobo: commissionAmount,
      status: 'earned',
    },
  })
}

const formatCurrency = (amountKobo: number, currency: string = 'USD') => {
  const normalized = currency.toUpperCase()
  const amount = amountKobo / 100
  if (normalized === 'NGN') {
    return `₦${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalized,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

const buildEmailSubject = (base: string) => {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `${base} #${suffix}`
}

const getIdempotencyKey = (req: Request) =>
  req.header('idempotency-key')
  ?? req.header('Idempotency-Key')
  ?? req.header('x-idempotency-key')
  ?? undefined

const resolveSafeHavenPayload = (order: Order) => (order.metadata as { safehaven?: any } | null)?.safehaven

const BREEZY_SUBSCRIPTION_DAYS = 7
const BREEZY_RENEWAL_WINDOW_DAYS = 2

const isBreezyChallengeType = (challengeType?: string | null) => String(challengeType ?? '').toLowerCase() === 'breezy'
const PHASE2_REPEAT_SUPPORTED_TYPES = new Set(['ngn_standard', 'ngn_flexi'])

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)

const isPhase2RepeatChallengeType = (challengeType?: string | null) =>
  PHASE2_REPEAT_SUPPORTED_TYPES.has(String(challengeType ?? '').toLowerCase())

type RepeatTrackedAccount = CTraderAccount & {
  archivedAt?: Date | null
  phase2RepeatUsedAt?: Date | null
  repeatedFromAccountId?: number | null
  repeatReplacedByAccountId?: number | null
}

type RepeatTrackedOrder = Order & {
  repeatForAccountId?: number | null
  repeatForChallengeId?: string | null
}

const isEligibleForPhase2Repeat = (account: {
  challengeType?: string | null
  phase?: string | null
  status?: string | null
  phase2RepeatUsedAt?: Date | null
  archivedAt?: Date | null
}) => {
  if (!isPhase2RepeatChallengeType(account.challengeType)) return false
  if (String(account.phase ?? '').toLowerCase() !== 'phase_2') return false
  if (String(account.status ?? '').toLowerCase() !== 'breached') return false
  if (account.phase2RepeatUsedAt) return false
  if (account.archivedAt) return false
  return true
}

const resolvePhase2RepeatAmountKobo = async (account: {
  challengeType?: string | null
  accountSize: string
  currency?: string | null
}) => {
  const plan = await prisma.challengePlan.findFirst({
    where: {
      phase: 'phase_1',
      accountSize: account.accountSize,
      enabled: true,
      ...(account.challengeType != null ? { challengeType: account.challengeType } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (!plan) {
    throw new ApiError('Unable to determine repeat fee for this account.', 400)
  }

  const baseAmountKobo = Math.round(Number(plan.price) * 100)
  if (!Number.isFinite(baseAmountKobo) || baseAmountKobo <= 0) {
    throw new ApiError('Invalid challenge fee configured for this account.', 400)
  }

  return {
    planId: plan.planId,
    amountKobo: Math.round(baseAmountKobo * 1.1),
    currency: (plan.currency || account.currency || 'NGN').toUpperCase(),
  }
}

const buildPhase2RepeatResponse = (order: RepeatTrackedOrder, safehavenPayload?: any) => ({
  ...buildBankTransferResponse(order, safehavenPayload),
  repeat_for_account_id: order.repeatForAccountId ?? null,
  repeat_for_challenge_id: order.repeatForChallengeId ?? null,
})

const fulfillPhase2RepeatOrder = async (order: RepeatTrackedOrder) => {
  if (!order.repeatForAccountId) {
    throw new ApiError('Repeat order is missing target account.', 400)
  }

  const breachedAccount = await prisma.cTraderAccount.findUnique({
    where: { id: order.repeatForAccountId },
    include: { user: true },
  }) as (RepeatTrackedAccount & { user: { email: string; fullName: string | null } | null }) | null

  if (!breachedAccount) {
    throw new ApiError('Original breached account not found.', 404)
  }

  if (!isEligibleForPhase2Repeat(breachedAccount)) {
    return
  }

  const assigned = await assignReadyAccount(order.userId, {
    challengeType: breachedAccount.challengeType ?? 'ngn_standard',
    phase: 'phase_2',
    accountSize: breachedAccount.accountSize,
    currency: breachedAccount.currency ?? 'NGN',
    platform: breachedAccount.platform ?? 'ctrader',
    baseChallengeId: normalizeChallengeBase(breachedAccount.challengeId),
  })

  if (!assigned) {
    await prisma.order.update({
      where: { id: order.id },
      data: { assignmentStatus: 'pending_assign' },
    })
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { assignmentStatus: 'assigned' },
    })

    await tx.cTraderAccount.update({
      where: { id: breachedAccount.id },
      data: {
        archivedAt: new Date(),
        phase2RepeatUsedAt: new Date(),
        repeatReplacedByAccountId: assigned.id,
      } as Prisma.CTraderAccountUncheckedUpdateInput,
    })

    await tx.cTraderAccount.update({
      where: { id: assigned.id },
      data: {
        repeatedFromAccountId: breachedAccount.id,
      } as Prisma.CTraderAccountUncheckedUpdateInput,
    })
  })

  const resolvedPlatform = String(assigned.platform ?? breachedAccount.platform ?? 'ctrader').toLowerCase()
  if (resolvedPlatform === 'mt5') {
    await prisma.cTraderAccount.update({
      where: { id: assigned.id },
      data: { status: 'active', accessStatus: 'granted', accessGrantedAt: new Date() },
    })
  } else {
    try {
      await requestAccountAccess({
        user_email: breachedAccount.user?.email ?? '',
        account_number: assigned.accountNumber,
        broker: assigned.brokerName,
        platform: resolvedPlatform,
        ...(breachedAccount.user?.fullName ? { user_name: breachedAccount.user.fullName } : {}),
        ...(assigned.challengeType ? { account_type: assigned.challengeType } : {}),
        ...(assigned.phase ? { account_phase: assigned.phase } : {}),
        ...(assigned.accountSize ? { account_size: assigned.accountSize } : {}),
        ...(assigned.mt5Login ? { mt5_login: assigned.mt5Login } : {}),
        ...(assigned.mt5Server ? { mt5_server: assigned.mt5Server } : {}),
        ...(assigned.mt5Password ? { mt5_password: assigned.mt5Password } : {}),
      })
    } catch (error) {
      console.error('Failed to request repeat account access grant', {
        orderId: order.id,
        providerOrderId: order.providerOrderId,
        accountNumber: assigned.accountNumber,
        error,
      })
    }
  }

  await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', order.userId]))
}

const canRenewBreezyAccount = (expiresAt?: Date | null) => {
  if (!expiresAt) return false
  const now = Date.now()
  const renewalOpenAt = expiresAt.getTime() - (BREEZY_RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  return now >= renewalOpenAt && now < expiresAt.getTime()
}

const buildBankTransferResponse = (order: Order, safehavenPayload?: any) => {
  const safehaven = safehavenPayload ?? resolveSafeHavenPayload(order)
  const resolvedAccountNumber = String(
    safehaven?.accountNumber
      ?? safehaven?.account_number
      ?? safehaven?.account?.accountNumber
      ?? safehaven?.account?.account_number
      ?? safehaven?.account?.number
      ?? order.safehavenAccountNumber
      ?? ''
  )
  const resolvedAccountName = String(
    safehaven?.accountName
      ?? safehaven?.account_name
      ?? safehaven?.account?.accountName
      ?? safehaven?.account?.account_name
      ?? safehaven?.account?.name
      ?? order.safehavenAccountName
      ?? ''
  )
  const resolvedBankName = String(
    safehaven?.bankName
      ?? safehaven?.bank_name
      ?? safehaven?.account?.bankName
      ?? safehaven?.account?.bank_name
      ?? order.safehavenBankName
      ?? 'SafeHaven MFB'
  )
  const resolvedBankCode = String(
    safehaven?.bankCode
      ?? safehaven?.bank_code
      ?? safehaven?.account?.bankCode
      ?? safehaven?.account?.bank_code
      ?? ''
  )
  const resolvedAmount = safehaven?.amount ?? order.netAmountKobo / 100

  return {
    provider_order_id: order.providerOrderId,
    status: order.status,
    assignment_status: order.assignmentStatus,
    currency: order.currency,
    gross_amount_kobo: order.grossAmountKobo,
    discount_amount_kobo: order.discountAmountKobo,
    net_amount_kobo: order.netAmountKobo,
    bank_transfer_amount_ngn: resolvedAmount,
    bank_transfer_rate: null,
    bank_transfer_bank_code: resolvedBankCode,
    plan_id: order.planId,
    account_size: order.accountSize,
    challenge_type: order.challengeType,
    phase: order.phase,
    coupon_code: order.couponCode,
    checkout_url: order.checkoutUrl,
    payer_bank_name: resolvedBankName,
    payer_account_name: resolvedAccountName,
    payer_virtual_acc_no: resolvedAccountNumber,
    expires_at: order.safehavenExpiresAt?.toISOString() ?? null,
    challenge_id: null,
    order_type: order.orderType ?? 'initial_purchase',
    renewal_for_account_number: order.renewalForAccountNumber ?? null,
  }
}

const buildFreeOrderResponse = (order: Order) => ({
  provider_order_id: order.providerOrderId,
  status: order.status,
  assignment_status: order.assignmentStatus,
  currency: order.currency,
  gross_amount_kobo: order.grossAmountKobo,
  discount_amount_kobo: order.discountAmountKobo,
  net_amount_kobo: order.netAmountKobo,
  plan_id: order.planId,
  account_size: order.accountSize,
  challenge_type: order.challengeType,
  phase: order.phase,
  coupon_code: order.couponCode,
  challenge_id: null,
})

const buildCryptoOrderResponse = (order: Order) => ({
  provider_order_id: order.providerOrderId,
  status: order.status,
  assignment_status: order.assignmentStatus,
  currency: order.currency,
  gross_amount_kobo: order.grossAmountKobo,
  discount_amount_kobo: order.discountAmountKobo,
  net_amount_kobo: order.netAmountKobo,
  plan_id: order.planId,
  account_size: order.accountSize,
  challenge_type: order.challengeType,
  phase: order.phase,
  coupon_code: order.couponCode,
  crypto_currency: order.cryptoCurrency,
  crypto_address: order.cryptoAddress,
  crypto_networks: order.cryptoCurrency === 'USDT'
    ? {
      ERC20: env.cryptoEthAddress,
      SOL: env.cryptoSolAddress,
      TRC20: env.cryptoTrxAddress,
    }
    : null,
  challenge_id: null,
})

const handleCompletedOrder = async (order: Order) => {
  const isAtticOrder = String(order.challengeType ?? '').toLowerCase() === 'attic'

  await redeemCouponForCompletedOrder({
    couponId: (order as { metadata?: { couponId?: number | null } | null }).metadata?.couponId ?? null,
    userId: order.userId,
    orderId: order.id,
  })

  let onboardingCertificateUrl: string | null = null
  let certificateAttachments: Array<{ filename: string; content: Buffer; contentType?: string }> | undefined

  if (!isAtticOrder) {
    try {
      const certificate = await createOnboardingCertificate({
        userId: order.userId,
        orderId: order.id,
        challengeType: order.challengeType,
        phase: order.phase,
        accountSize: order.accountSize,
      })
      onboardingCertificateUrl = certificate.certificateUrl
      if (onboardingCertificateUrl) {
        certificateAttachments = [
          await fetchRemoteAttachment({
            url: onboardingCertificateUrl,
            filename: 'onboarding-certificate.png',
            contentType: 'image/png',
          }),
        ]
      }
    } catch (error) {
      console.error('Failed to create onboarding certificate', error)
    }
  }

  const user = await prisma.user.findUnique({ where: { id: order.userId } })
  if (user?.email) {
    try {
      const objectives = await buildObjectiveFields({
        accountSize: order.accountSize,
        challengeType: order.challengeType ?? 'two_step',
        phase: order.phase ?? 'phase_1',
      })
      const objectivesLines = [
        objectives.maxDdPercent != null ? `Max Drawdown: ${objectives.maxDdPercent}%` : null,
        objectives.dailyDdPercent != null ? `Daily Drawdown: ${objectives.dailyDdPercent}%` : null,
        objectives.profitTargetPercent != null ? `Profit Target: ${objectives.profitTargetPercent}%` : null,
        objectives.minTradingDaysRequired != null ? `Minimum Trading Days: ${objectives.minTradingDaysRequired}` : null,
        objectives.minTradeDurationMinutes != null ? `Min Trade Duration: ${objectives.minTradeDurationMinutes} mins` : null,
        objectives.profitSplitPercent != null ? `Profit Split: ${objectives.profitSplitPercent}%` : null,
        objectives.withdrawalSchedule ? `Withdrawal Schedule: ${objectives.withdrawalSchedule}` : null,
      ].filter(Boolean)

      const emailResponse = await sendUnifiedEmail({
        to: user.email,
        subject: buildEmailSubject('Your purchase receipt & trading objectives'),
        title: 'Challenge Purchase Confirmed',
        subtitle: 'Your trading objectives are ready',
        content: `Thank you for your purchase! Your ${order.accountSize} ${order.challengeType ?? 'two_step'} challenge has been confirmed. Please review your receipt and objectives below.`,
        buttonText: 'View Dashboard',
        infoBox: [
          `Receipt: ${formatCurrency(order.netAmountKobo, order.currency ?? 'USD')} (${order.paymentMethod ?? 'payment'})`,
          `Order ID: ${order.providerOrderId ?? order.id}`,
          `Status: ${order.status}`,
          `Objectives: ${objectivesLines.length ? objectivesLines.join(' | ') : 'Check your dashboard for objectives.'}`,
        ].join('<br>'),
        ...(!isAtticOrder && certificateAttachments ? { attachments: certificateAttachments } : {}),
      })
      console.info('Purchase email send result', {
        orderId: order.id,
        providerOrderId: order.providerOrderId,
        to: user.email,
        response: emailResponse,
      })
    } catch (error) {
      console.error('Failed to send purchase email', error)
    }
  } else {
    console.warn('Purchase email skipped because user email is missing', {
      orderId: order.id,
      providerOrderId: order.providerOrderId,
    })
  }

  if (order.assignmentStatus !== 'assigned') {
    const accountSizeDigits = order.accountSize.replace(/\D/g, '')
    const assignmentAccountSize = accountSizeDigits ? `$${accountSizeDigits}` : order.accountSize

    try {
      const assigned = await assignReadyAccount(order.userId, {
        challengeType: order.challengeType ?? 'challenge',
        phase: order.phase ?? 'phase_1',
        accountSize: assignmentAccountSize,
        currency: order.currency ?? (isAtticOrder ? 'NGN' : 'USD'),
        platform: (order.metadata as { platform?: string } | null)?.platform ?? 'ctrader',
        baseChallengeId: buildBaseChallengeId(order.id),
      })

    if (assigned) {
      await prisma.order.update({
        where: { id: order.id },
        data: { assignmentStatus: 'assigned' },
      })

      const resolvedPlatform = (order.metadata as { platform?: string } | null)?.platform ?? 'ctrader'

      if (resolvedPlatform.toLowerCase() === 'mt5') {
        const activated = await prisma.cTraderAccount.update({
          where: { id: assigned.id },
          data: { status: 'active', accessStatus: 'granted', accessGrantedAt: new Date() },
        })
        if (isBreezyChallengeType(order.challengeType)) {
          const paidAt = order.paidAt ?? new Date()
          await prisma.cTraderAccount.update({
            where: { id: activated.id },
            data: {
              subscriptionStartedAt: paidAt,
              subscriptionExpiresAt: addDays(paidAt, BREEZY_SUBSCRIPTION_DAYS),
              subscriptionStatus: 'active',
              renewalPriceKobo: order.netAmountKobo,
            },
          })
        }
      } else {
        try {
          const accessAccountSize = assigned.accountSize ?? order.accountSize
          await requestAccountAccess({
            user_email: user?.email ?? '',
            account_number: assigned.accountNumber,
            broker: assigned.brokerName,
            platform: resolvedPlatform,
            ...(user?.fullName ? { user_name: user.fullName } : {}),
            ...(order.challengeType ? { account_type: order.challengeType } : {}),
            ...(order.phase ? { account_phase: order.phase } : {}),
            ...(accessAccountSize ? { account_size: accessAccountSize } : {}),
            ...(assigned.mt5Login ? { mt5_login: assigned.mt5Login } : {}),
            ...(assigned.mt5Server ? { mt5_server: assigned.mt5Server } : {}),
            ...(assigned.mt5Password ? { mt5_password: assigned.mt5Password } : {}),
          })
        } catch (error) {
          console.error('Failed to request access-engine account grant', {
            orderId: order.id,
            providerOrderId: order.providerOrderId,
            accountNumber: assigned.accountNumber,
            error,
          })
        }
      }
    } else {
        await prisma.order.update({
          where: { id: order.id },
          data: { assignmentStatus: 'pending_assign' },
        })
        console.warn('No ready account available for assignment', {
          orderId: order.id,
          providerOrderId: order.providerOrderId,
          accountSize: order.accountSize,
          challengeType: order.challengeType,
          phase: order.phase,
        })
      }
    } catch (error) {
      console.error('Failed to assign ready account after payment completion', {
        orderId: order.id,
        providerOrderId: order.providerOrderId,
        challengeType: order.challengeType,
        currency: order.currency,
        accountSize: order.accountSize,
        assignmentAccountSize,
        error,
      })
      await prisma.order.update({
        where: { id: order.id },
        data: { assignmentStatus: 'pending_assign' },
      })
    }
  }

  await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', order.userId]))

  return prisma.order.findUnique({ where: { id: order.id } })
}

export const markAccountStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { account_number, status } = req.body as { account_number?: string; status?: string }
    if (!account_number || !status) {
      throw new ApiError('account_number and status are required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: { accountNumber: account_number },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    const normalizedStatus = status.toLowerCase()
    if (burnStatuses.has(normalizedStatus)) {
      await maybeBurnAccount(account.id)
      try {
        await pushActiveAccountRemove(account.accountNumber, normalizedStatus)
      } catch (error) {
        console.error('Failed to push active account removal', error)
      }
    }

    if (account.userId) {
      await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', account.userId]))
      await clearCacheByPrefix(buildCacheKey(['payouts', 'summary', account.userId]))
    }

    res.json({ message: 'Account status updated', account_id: account.id })
  } catch (err) {
    next(err as Error)
  }
}

export const confirmAccessGrant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.header('x-access-engine-key')
    if (env.accessEngineApiKey && apiKey !== env.accessEngineApiKey) {
      throw new ApiError('Unauthorized access engine request', 401)
    }

    const { account_number, user_email, status } = req.body as {
      account_number?: string
      user_email?: string
      status?: string
    }

    if (!account_number || !user_email) {
      throw new ApiError('account_number and user_email are required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: { accountNumber: account_number },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    const updated = await prisma.cTraderAccount.update({
      where: { id: account.id },
      data: {
        status: status?.toLowerCase() === 'granted' ? 'active' : account.status,
        accessStatus: status?.toLowerCase() === 'granted' ? 'granted' : 'revoked',
        accessGrantedAt: status?.toLowerCase() === 'granted' ? new Date() : null,
      },
    })

    if (status?.toLowerCase() !== 'granted') {
      try {
        await pushActiveAccountRemove(updated.accountNumber, status ?? 'revoked')
      } catch (error) {
        console.error('Failed to push active account removal', error)
      }
    }

    if (account.userId) {
      await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', account.userId]))
      await clearCacheByPrefix(buildCacheKey(['payouts', 'summary', account.userId]))
    }

    res.json({ message: 'Access status updated' })
  } catch (err) {
    next(err as Error)
  }
}

type AuthRequest = Request & { user?: { id: number; email: string } }

const ensureUser = (req: AuthRequest) => {
  const user = req.user
  if (!user) {
    throw new ApiError('Unauthorized', 401)
  }
  return user
}

export const listOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 5)
    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { userId: user.id } }),
    ])

    const pages = Math.max(1, Math.ceil(total / limit))

    res.json({
      orders: orders.map((order) => ({
        id: order.id,
        provider_order_id: order.providerOrderId,
        status: order.status,
        assignment_status: order.assignmentStatus,
        account_size: order.accountSize,
        net_amount_kobo: order.netAmountKobo,
        net_amount_formatted: formatCurrency(order.netAmountKobo, order.currency),
        payment_method: order.paymentMethod,
        payment_provider: order.paymentProvider,
        created_at: order.createdAt,
        paid_at: order.paidAt,
      })),
      pagination: { page, limit, total, pages },
    })
  } catch (err) {
    next(err as Error)
  }
}

export const getOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const providerOrderId = req.params.providerOrderId
    const providerOrderIdValue = Array.isArray(providerOrderId) ? providerOrderId[0] : providerOrderId

    if (!providerOrderIdValue) {
      throw new ApiError('providerOrderId is required', 400)
    }

    const order = await prisma.order.findFirst({
      where: { providerOrderId: providerOrderIdValue, userId: user.id },
    })

    if (!order) {
      throw new ApiError('Order not found', 404)
    }

    res.json({
      provider_order_id: order.providerOrderId,
      status: order.status,
      assignment_status: order.assignmentStatus,
      challenge_id: order.assignmentStatus === 'assigned'
        ? (await prisma.cTraderAccount.findFirst({ where: { userId: user.id }, orderBy: { assignedAt: 'desc' } }))?.challengeId ?? null
        : null,
      message: 'Order status fetched',
    })
  } catch (err) {
    next(err as Error)
  }
}

export const createBankTransferOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const idempotencyKey = getIdempotencyKey(req)
    const { plan_id, account_size, amount_kobo, coupon_code, challenge_type, phase, platform } = req.body as {
      plan_id?: string
      account_size?: string
      amount_kobo?: number
      coupon_code?: string | null
      challenge_type?: string
      phase?: string
      platform?: string
    }
    const rawAffiliateId = req.header('x-affiliate-id')
    const affiliateId = rawAffiliateId
      ? Number(Array.isArray(rawAffiliateId) ? rawAffiliateId[0] : rawAffiliateId)
      : (req.body as { affiliate_id?: number }).affiliate_id

    if (!plan_id || !account_size || !amount_kobo || !challenge_type || !phase) {
      throw new ApiError('plan_id, account_size, amount_kobo, challenge_type, and phase are required', 400)
    }
    assertChallengeTypePurchasable(challenge_type)
    const normalizedPlatform = String(platform ?? 'ctrader').toLowerCase()
    if (!['ctrader', 'mt5'].includes(normalizedPlatform)) {
      throw new ApiError('platform must be ctrader or mt5', 400)
    }

    if (idempotencyKey) {
      const existing = await prisma.order.findFirst({
        where: { userId: user.id, idempotencyKey },
      })
      if (existing) {
        if (existing.paymentMethod !== 'bank_transfer') {
          throw new ApiError('Idempotency key already used for another order.', 409)
        }
        res.json(buildBankTransferResponse(existing))
        return
      }
    }

    const providerOrderId = `MF-${Date.now()}-${Math.floor(Math.random() * 9999)}`

    const couponResult = await applyCouponToOrder({
      code: coupon_code ?? null,
      planId: plan_id,
      amountKobo: amount_kobo,
      challengeType: challenge_type,
      userId: user.id,
    })

    if (couponResult.finalAmountKobo <= 0) {
      const freeOrder = await prisma.order.create({
        data: {
          providerOrderId,
          status: 'completed',
          assignmentStatus: 'unassigned',
          currency: isNgnChallengeType(challenge_type) ? 'NGN' : 'USD',
          grossAmountKobo: amount_kobo,
          discountAmountKobo: couponResult.discountAmountKobo,
          netAmountKobo: couponResult.finalAmountKobo,
          planId: plan_id,
          accountSize: account_size,
          challengeType: challenge_type,
          phase,
          couponCode: couponResult.couponCode,
          checkoutUrl: null,
          paymentMethod: 'coupon',
          paymentProvider: 'internal',
          metadata: {
            platform: normalizedPlatform,
            couponId: couponResult.couponId,
          },
          paidAt: new Date(),
          userId: user.id,
          affiliateId: affiliateId && !Number.isNaN(affiliateId) && affiliateId !== user.id ? affiliateId : null,
          idempotencyKey,
        } as Prisma.OrderUncheckedCreateInput,
      })

      const finalizedFreeOrder = (await handleCompletedOrder(freeOrder)) ?? freeOrder
      res.json(buildFreeOrderResponse(finalizedFreeOrder))
      return
    }

    const isNgnOrder = isNgnChallengeType(challenge_type)
    const fxConfig = await getFxRatesConfig()
    const baseAmount = couponResult.finalAmountKobo / 100
    const usdToNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
    const ngnAmount = Math.round(isNgnOrder ? baseAmount : baseAmount * usdToNgnRate)

    const virtualAccount = await createVirtualAccount({
      amount: ngnAmount,
      externalReference: providerOrderId,
    })

    const resolvedAccountNumber = String(
      virtualAccount.accountNumber
        ?? (virtualAccount as { account_number?: string }).account_number
        ?? (virtualAccount as { account?: { accountNumber?: string; account_number?: string; number?: string } }).account?.accountNumber
        ?? (virtualAccount as { account?: { accountNumber?: string; account_number?: string; number?: string } }).account?.account_number
        ?? (virtualAccount as { account?: { accountNumber?: string; account_number?: string; number?: string } }).account?.number
        ?? ''
    )
    const resolvedAccountName = String(
      virtualAccount.accountName
        ?? (virtualAccount as { account_name?: string }).account_name
        ?? (virtualAccount as { account?: { accountName?: string; account_name?: string; name?: string } }).account?.accountName
        ?? (virtualAccount as { account?: { accountName?: string; account_name?: string; name?: string } }).account?.account_name
        ?? (virtualAccount as { account?: { accountName?: string; account_name?: string; name?: string } }).account?.name
        ?? ''
    )
    const resolvedBankName = String(
      virtualAccount.bankName
        ?? (virtualAccount as { bank_name?: string }).bank_name
        ?? (virtualAccount as { account?: { bankName?: string; bank_name?: string } }).account?.bankName
        ?? (virtualAccount as { account?: { bankName?: string; bank_name?: string } }).account?.bank_name
        ?? 'SafeHaven MFB'
    )
    const resolvedBankCode = String(
      virtualAccount.bankCode
        ?? (virtualAccount as { bank_code?: string }).bank_code
        ?? (virtualAccount as { account?: { bankCode?: string; bank_code?: string } }).account?.bankCode
        ?? (virtualAccount as { account?: { bankCode?: string; bank_code?: string } }).account?.bank_code
        ?? ''
    )
    const resolvedAmount = virtualAccount.amount ?? ngnAmount

    const order = await prisma.order.create({
      data: {
        providerOrderId,
        status: 'pending',
        assignmentStatus: 'unassigned',
        currency: isNgnChallengeType(challenge_type) ? 'NGN' : 'USD',
        grossAmountKobo: amount_kobo,
        discountAmountKobo: couponResult.discountAmountKobo,
        netAmountKobo: couponResult.finalAmountKobo,
        planId: plan_id,
        accountSize: account_size,
        challengeType: challenge_type,
        phase,
        couponCode: couponResult.couponCode,
        checkoutUrl: null,
        paymentMethod: 'bank_transfer',
        paymentProvider: 'safehaven',
        orderType: 'initial_purchase',
        safehavenAccountId: virtualAccount._id,
        safehavenAccountNumber: resolvedAccountNumber,
        safehavenAccountName: resolvedAccountName,
        safehavenBankName: resolvedBankName,
        safehavenExpiresAt: virtualAccount.expiryDate ? new Date(virtualAccount.expiryDate) : null,
        safehavenSessionId: virtualAccount.sessionId ?? null,
        metadata: {
          safehaven: virtualAccount,
          platform: normalizedPlatform,
          couponId: couponResult.couponId,
        },
        userId: user.id,
        affiliateId: affiliateId && !Number.isNaN(affiliateId) && affiliateId !== user.id ? affiliateId : null,
        idempotencyKey,
      } as Prisma.OrderUncheckedCreateInput,
    })

    res.json({
      ...buildBankTransferResponse(order, virtualAccount),
      bank_transfer_rate: usdToNgnRate,
      bank_transfer_bank_code: resolvedBankCode,
      bank_transfer_amount_ngn: resolvedAmount,
      payer_bank_name: resolvedBankName || order.safehavenBankName,
      payer_account_name: resolvedAccountName || order.safehavenAccountName,
      payer_virtual_acc_no: resolvedAccountNumber || order.safehavenAccountNumber,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const createBreezyRenewalOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const accountId = Number(req.params.accountId)
    const account = await prisma.cTraderAccount.findFirst({
      where: { id: accountId, userId: user.id },
    }) as RepeatTrackedAccount | null

    if (!account) throw new ApiError('Account not found', 404)
    if (!isBreezyChallengeType(account.challengeType)) throw new ApiError('Only Breezy accounts can be renewed here.', 400)
    if (String(account.subscriptionStatus ?? '').toLowerCase() === 'completed' || String(account.status).toLowerCase() === 'completed') {
      throw new ApiError('This Breezy account has expired and cannot be renewed.', 400)
    }
    if (!canRenewBreezyAccount(account.subscriptionExpiresAt)) {
      throw new ApiError('Renewal is only available within 2 days of expiration.', 400)
    }

    await prisma.order.updateMany({
      where: {
        renewalForAccountNumber: account.accountNumber,
        orderType: 'breezy_renewal',
        status: 'pending',
      },
      data: {
        status: 'expired',
      },
    })

    const amountKobo = account.renewalPriceKobo ?? 0
    if (!amountKobo || amountKobo <= 0) {
      throw new ApiError('Renewal amount is not configured for this account.', 400)
    }

    const providerOrderId = `BREEZY-RENEW-${Date.now()}-${Math.floor(Math.random() * 9999)}`
    const virtualAccount = await createVirtualAccount({
      amount: Math.round(amountKobo / 100),
      externalReference: providerOrderId,
    })

    const resolvedAccountNumber = String(
      virtualAccount.accountNumber
        ?? (virtualAccount as { account_number?: string }).account_number
        ?? (virtualAccount as { account?: { accountNumber?: string; account_number?: string; number?: string } }).account?.accountNumber
        ?? (virtualAccount as { account?: { accountNumber?: string; account_number?: string; number?: string } }).account?.account_number
        ?? (virtualAccount as { account?: { number?: string } }).account?.number
        ?? ''
    )
    const resolvedAccountName = String(
      virtualAccount.accountName
        ?? (virtualAccount as { account_name?: string }).account_name
        ?? (virtualAccount as { account?: { accountName?: string; account_name?: string; name?: string } }).account?.accountName
        ?? (virtualAccount as { account?: { account_name?: string; name?: string } }).account?.account_name
        ?? (virtualAccount as { account?: { name?: string } }).account?.name
        ?? ''
    )
    const resolvedBankName = String(
      virtualAccount.bankName
        ?? (virtualAccount as { bank_name?: string }).bank_name
        ?? (virtualAccount as { account?: { bankName?: string; bank_name?: string } }).account?.bankName
        ?? (virtualAccount as { account?: { bank_name?: string } }).account?.bank_name
        ?? 'SafeHaven MFB'
    )

    const order = await prisma.order.create({
      data: {
        providerOrderId,
        status: 'pending',
        assignmentStatus: 'assigned',
        currency: 'NGN',
        grossAmountKobo: amountKobo,
        discountAmountKobo: 0,
        netAmountKobo: amountKobo,
        planId: account.accountSize.replace(/[^0-9]/g, ''),
        accountSize: account.accountSize,
        challengeType: 'breezy',
        phase: account.phase,
        paymentMethod: 'bank_transfer',
        paymentProvider: 'safehaven',
        orderType: 'breezy_renewal',
        renewalForAccountNumber: account.accountNumber,
        renewalForChallengeId: account.challengeId,
        safehavenAccountId: virtualAccount._id,
        safehavenAccountNumber: resolvedAccountNumber,
        safehavenAccountName: resolvedAccountName,
        safehavenBankName: resolvedBankName,
        safehavenExpiresAt: virtualAccount.expiryDate ? new Date(virtualAccount.expiryDate) : null,
        safehavenSessionId: virtualAccount.sessionId ?? null,
        metadata: {
          safehaven: virtualAccount,
          platform: account.platform ?? 'mt5',
          renewal: true,
        },
        userId: user.id,
      } as Prisma.OrderUncheckedCreateInput,
    })

    await prisma.cTraderAccount.update({
      where: { id: account.id },
      data: { subscriptionStatus: 'renewal_due' },
    })

    res.json(buildBankTransferResponse(order, virtualAccount))
  } catch (err) {
    next(err as Error)
  }
}

export const createPhase2RepeatOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const accountId = Number(req.params.accountId)
    const account = await prisma.cTraderAccount.findFirst({
      where: { id: accountId, userId: user.id },
    })

    if (!account) throw new ApiError('Account not found', 404)
    if (!isEligibleForPhase2Repeat(account)) {
      throw new ApiError('This account is not eligible for a Phase 2 repeat.', 400)
    }

    await prisma.order.updateMany({
      where: {
        repeatForAccountId: account.id,
        orderType: 'phase2_repeat',
        status: 'pending',
      },
      data: { status: 'expired' },
    })

    const existingCompleted = await prisma.order.findFirst({
      where: {
        repeatForAccountId: account.id,
        orderType: 'phase2_repeat',
        status: 'completed',
      },
    }) as RepeatTrackedOrder | null
    if (existingCompleted || account.phase2RepeatUsedAt) {
      throw new ApiError('Repeat has already been used for this account.', 409)
    }

    const pricing = await resolvePhase2RepeatAmountKobo(account)
    const providerOrderId = `P2R-${Date.now()}-${Math.floor(Math.random() * 9999)}`
    const virtualAccount = await createVirtualAccount({
      amount: Math.round(pricing.amountKobo / 100),
      externalReference: providerOrderId,
    })

    const resolvedAccountNumber = String(
      virtualAccount.accountNumber
        ?? (virtualAccount as { account_number?: string }).account_number
        ?? (virtualAccount as { account?: { accountNumber?: string; account_number?: string; number?: string } }).account?.accountNumber
        ?? (virtualAccount as { account?: { accountNumber?: string; account_number?: string; number?: string } }).account?.account_number
        ?? (virtualAccount as { account?: { number?: string } }).account?.number
        ?? ''
    )
    const resolvedAccountName = String(
      virtualAccount.accountName
        ?? (virtualAccount as { account_name?: string }).account_name
        ?? (virtualAccount as { account?: { accountName?: string; account_name?: string; name?: string } }).account?.accountName
        ?? (virtualAccount as { account?: { account_name?: string; name?: string } }).account?.account_name
        ?? (virtualAccount as { account?: { name?: string } }).account?.name
        ?? ''
    )
    const resolvedBankName = String(
      virtualAccount.bankName
        ?? (virtualAccount as { bank_name?: string }).bank_name
        ?? (virtualAccount as { account?: { bankName?: string; bank_name?: string } }).account?.bankName
        ?? (virtualAccount as { account?: { bank_name?: string } }).account?.bank_name
        ?? 'SafeHaven MFB'
    )

    const order = await prisma.order.create({
      data: {
        providerOrderId,
        status: 'pending',
        assignmentStatus: 'unassigned',
        currency: pricing.currency,
        grossAmountKobo: pricing.amountKobo,
        discountAmountKobo: 0,
        netAmountKobo: pricing.amountKobo,
        planId: pricing.planId,
        accountSize: account.accountSize,
        challengeType: account.challengeType,
        phase: 'phase_2',
        paymentMethod: 'bank_transfer',
        paymentProvider: 'safehaven',
        orderType: 'phase2_repeat',
        repeatForAccountId: account.id,
        repeatForChallengeId: account.challengeId,
        safehavenAccountId: virtualAccount._id,
        safehavenAccountNumber: resolvedAccountNumber,
        safehavenAccountName: resolvedAccountName,
        safehavenBankName: resolvedBankName,
        safehavenExpiresAt: virtualAccount.expiryDate ? new Date(virtualAccount.expiryDate) : null,
        safehavenSessionId: virtualAccount.sessionId ?? null,
        metadata: {
          safehaven: virtualAccount,
          platform: account.platform ?? 'ctrader',
          phase2Repeat: true,
          originalChallengeId: account.challengeId,
        },
        userId: user.id,
      } as Prisma.OrderUncheckedCreateInput,
    }) as RepeatTrackedOrder

    res.json(buildPhase2RepeatResponse(order, virtualAccount))
  } catch (err) {
    next(err as Error)
  }
}

export const createFreeOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const idempotencyKey = getIdempotencyKey(req)
    const { plan_id, account_size, amount_kobo, coupon_code, challenge_type, phase, platform } = req.body as {
      plan_id?: string
      account_size?: string
      amount_kobo?: number
      coupon_code?: string | null
      challenge_type?: string
      phase?: string
      platform?: string
    }
    const rawAffiliateId = req.header('x-affiliate-id')
    const affiliateId = rawAffiliateId
      ? Number(Array.isArray(rawAffiliateId) ? rawAffiliateId[0] : rawAffiliateId)
      : (req.body as { affiliate_id?: number }).affiliate_id

    if (!plan_id || !account_size || !amount_kobo || !challenge_type || !phase) {
      throw new ApiError('plan_id, account_size, amount_kobo, challenge_type, and phase are required', 400)
    }
    assertChallengeTypePurchasable(challenge_type)
    const normalizedPlatform = String(platform ?? 'ctrader').toLowerCase()
    if (!['ctrader', 'mt5'].includes(normalizedPlatform)) {
      throw new ApiError('platform must be ctrader or mt5', 400)
    }

    const couponResult = await applyCouponToOrder({
      code: coupon_code ?? null,
      planId: plan_id,
      amountKobo: amount_kobo,
      challengeType: challenge_type,
      userId: user.id,
    })

    if (couponResult.finalAmountKobo > 0) {
      throw new ApiError('Coupon does not cover the full amount', 400)
    }

    if (idempotencyKey) {
      const existing = await prisma.order.findFirst({
        where: { userId: user.id, idempotencyKey },
      })
      if (existing) {
        if (existing.paymentMethod !== 'coupon') {
          throw new ApiError('Idempotency key already used for another order.', 409)
        }
        res.json(buildFreeOrderResponse(existing))
        return
      }
    }

    const providerOrderId = `FREE-${Date.now()}-${Math.floor(Math.random() * 9999)}`

    const order = await prisma.order.create({
      data: {
        providerOrderId,
        status: 'completed',
        assignmentStatus: 'unassigned',
        currency: isNgnChallengeType(challenge_type) ? 'NGN' : 'USD',
        grossAmountKobo: amount_kobo,
        discountAmountKobo: couponResult.discountAmountKobo,
        netAmountKobo: couponResult.finalAmountKobo,
        planId: plan_id,
        accountSize: account_size,
        challengeType: challenge_type,
        phase,
        couponCode: couponResult.couponCode,
        paymentMethod: 'coupon',
        paymentProvider: 'internal',
        metadata: { platform: normalizedPlatform, couponId: couponResult.couponId },
        paidAt: new Date(),
        userId: user.id,
        affiliateId: affiliateId && !Number.isNaN(affiliateId) && affiliateId !== user.id ? affiliateId : null,
        idempotencyKey,
      } as Prisma.OrderUncheckedCreateInput,
    })

    if (order.netAmountKobo > 0) {
      const affiliateId = (order as { affiliateId?: number | null }).affiliateId
      await createAffiliateCommission(prisma, {
        id: order.id,
        ...(affiliateId !== undefined && affiliateId !== null ? { affiliateId } : {}),
        netAmountKobo: order.netAmountKobo,
        currency: order.currency,
      })
    }

    const finalized = (await handleCompletedOrder(order)) ?? order

    res.json(buildFreeOrderResponse(finalized))
  } catch (err) {
    next(err as Error)
  }
}

export const createCryptoOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const idempotencyKey = getIdempotencyKey(req)
    const { plan_id, account_size, amount_kobo, crypto_currency, challenge_type, phase, coupon_code, platform } = req.body as {
      plan_id?: string
      account_size?: string
      amount_kobo?: number
      crypto_currency?: keyof typeof CRYPTO_ADDRESSES
      challenge_type?: string
      phase?: string
      coupon_code?: string | null
      platform?: string
    }
    const rawAffiliateId = req.header('x-affiliate-id')
    const affiliateId = rawAffiliateId
      ? Number(Array.isArray(rawAffiliateId) ? rawAffiliateId[0] : rawAffiliateId)
      : (req.body as { affiliate_id?: number }).affiliate_id

    if (!plan_id || !account_size || !amount_kobo || !crypto_currency || !challenge_type || !phase) {
      throw new ApiError('plan_id, account_size, amount_kobo, crypto_currency, challenge_type, and phase are required', 400)
    }
    assertChallengeTypePurchasable(challenge_type)
    const normalizedPlatform = String(platform ?? 'ctrader').toLowerCase()
    if (!['ctrader', 'mt5'].includes(normalizedPlatform)) {
      throw new ApiError('platform must be ctrader or mt5', 400)
    }

    const normalizedCurrency = crypto_currency.toUpperCase() as keyof typeof CRYPTO_ADDRESSES
    if (!(normalizedCurrency in CRYPTO_ADDRESSES)) {
      throw new ApiError('Unsupported crypto currency', 400)
    }

    const address = resolveCryptoAddress(normalizedCurrency)
    if (!address) {
      throw new ApiError('Unsupported crypto currency', 400)
    }

    if (idempotencyKey) {
      const existing = await prisma.order.findFirst({
        where: { userId: user.id, idempotencyKey },
      })
      if (existing) {
        if (existing.paymentMethod !== 'crypto') {
          throw new ApiError('Idempotency key already used for another order.', 409)
        }
        res.json(buildCryptoOrderResponse(existing))
        return
      }
    }

    const providerOrderId = `CRYPTO-${Date.now()}-${Math.floor(Math.random() * 9999)}`

    const couponResult = await applyCouponToOrder({
      code: coupon_code ?? null,
      planId: plan_id,
      amountKobo: amount_kobo,
      challengeType: challenge_type,
      userId: user.id,
    })
    const order = await prisma.order.create({
      data: {
        providerOrderId,
        status: 'pending',
        assignmentStatus: 'unassigned',
        currency: isNgnChallengeType(challenge_type) ? 'NGN' : 'USD',
        grossAmountKobo: amount_kobo,
        discountAmountKobo: couponResult.discountAmountKobo,
        netAmountKobo: couponResult.finalAmountKobo,
        planId: plan_id,
        accountSize: account_size,
        challengeType: challenge_type,
        phase,
        couponCode: couponResult.couponCode,
        paymentMethod: 'crypto',
        paymentProvider: 'manual',
        metadata: { platform: normalizedPlatform, couponId: couponResult.couponId },
        cryptoCurrency: normalizedCurrency,
        cryptoAddress: address,
        userId: user.id,
        affiliateId: affiliateId && !Number.isNaN(affiliateId) && affiliateId !== user.id ? affiliateId : null,
        idempotencyKey,
      } as Prisma.OrderUncheckedCreateInput,
    })

    res.json(buildCryptoOrderResponse(order))
  } catch (err) {
    next(err as Error)
  }
}

export const handleSafeHavenWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as {
      sessionId?: string
      status?: string
      externalReference?: string
      data?: { status?: string; externalReference?: string; sessionId?: string }
    }
    const externalReference = payload.externalReference ?? payload.data?.externalReference
    if (!externalReference) {
      res.status(200).json({ received: true })
      return
    }

    const order = await prisma.order.findUnique({
      where: { providerOrderId: externalReference },
    })

    if (!order) {
      res.status(200).json({ received: true })
      return
    }

    const status = payload.status?.toLowerCase()
      ?? payload.data?.status?.toLowerCase()
      ?? 'pending'
    const mapped = status.includes('success') || status === 'completed' ? 'completed' : status

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const nextOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: mapped === 'completed' ? 'completed' : 'pending',
          paidAt: mapped === 'completed' ? new Date() : order.paidAt,
          safehavenSessionId: payload.sessionId
            ?? payload.data?.sessionId
            ?? order.safehavenSessionId,
        },
      })

      if (mapped === 'completed') {
        const affiliateId = (nextOrder as { affiliateId?: number | null }).affiliateId
      await createAffiliateCommission(tx, {
        id: nextOrder.id,
        ...(affiliateId !== undefined && affiliateId !== null ? { affiliateId } : {}),
        netAmountKobo: nextOrder.netAmountKobo,
        currency: nextOrder.currency,
      })
      }

      return nextOrder
    })

    if (mapped === 'completed') {
      if (updatedOrder.orderType === 'breezy_renewal' && updatedOrder.renewalForAccountNumber) {
        const renewalAccount = await prisma.cTraderAccount.findFirst({
          where: { accountNumber: updatedOrder.renewalForAccountNumber },
          include: { user: true },
        })
        if (renewalAccount) {
          const paidAt = updatedOrder.paidAt ?? new Date()
          const baseDate = renewalAccount.subscriptionExpiresAt && renewalAccount.subscriptionExpiresAt > paidAt
            ? renewalAccount.subscriptionExpiresAt
            : paidAt
          await prisma.cTraderAccount.update({
            where: { id: renewalAccount.id },
            data: {
              subscriptionStatus: 'active',
              lastRenewalPaidAt: paidAt,
              subscriptionExpiresAt: addDays(baseDate, BREEZY_SUBSCRIPTION_DAYS),
            },
          })
          if (renewalAccount.userId) {
            await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', renewalAccount.userId]))
          }

          if (renewalAccount.user?.email) {
            const nextExpiryDate = addDays(baseDate, BREEZY_SUBSCRIPTION_DAYS)
            const cycleKey = nextExpiryDate.toISOString().slice(0, 10)
            await sendEmailOnce({
              type: `BREEZY_RENEWAL_SUCCESS_${cycleKey}`,
              accountId: renewalAccount.id,
              userId: renewalAccount.userId ?? null,
              send: async () => {
                await sendUnifiedEmail({
                  to: renewalAccount.user!.email,
                  subject: '✅ Breezy subscription renewed successfully',
                  title: 'Breezy renewal confirmed',
                  subtitle: 'Your account is active for another cycle',
                  content: 'Your Breezy renewal payment was successful and your subscription has been extended.',
                  buttonText: 'View Dashboard',
                  infoBox: [
                    `Account: ${renewalAccount.accountNumber}`,
                    `Renewal Amount: ${formatCurrency(updatedOrder.netAmountKobo, 'NGN')}`,
                    `New Expiry Date: ${nextExpiryDate.toISOString()}`,
                  ].join('<br>'),
                })
              },
            })
          }
        }
      } else if ((updatedOrder as RepeatTrackedOrder).orderType === 'phase2_repeat' && (updatedOrder as RepeatTrackedOrder).repeatForAccountId) {
        await fulfillPhase2RepeatOrder(updatedOrder as RepeatTrackedOrder)
      } else {
        await handleCompletedOrder(updatedOrder)
      }
    }

    res.json({ received: true })
  } catch (err) {
    next(err as Error)
  }
}