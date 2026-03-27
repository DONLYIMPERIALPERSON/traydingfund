import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Prisma } from '@prisma/client'
import { env } from '../../config/env'
import { ApiError } from '../../common/errors'
import { createVirtualAccount } from '../../services/safehaven.service'
import { getFxRatesConfig } from '../fxRates/fxRates.service'
import { requestAccountAccess } from '../../services/accessEngine.service'
import { assignReadyAccountFromPool } from '../ctrader/ctrader.assignment'
import { createOnboardingCertificate } from '../../services/certificate.service'
import { buildObjectiveFields } from '../ctrader/ctrader.objectives'
import { fetchRemoteAttachment, sendUnifiedEmail } from '../../services/email.service'
import { applyCouponToOrder } from '../../services/coupon.service'

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

const assignReadyAccount = async (
  userId: number,
  payload: { challengeType: string; phase: string; accountSize: string },
) => assignReadyAccountFromPool({
  userId,
  challengeType: payload.challengeType,
  phase: payload.phase,
  accountSize: payload.accountSize,
})

const maybeBurnAccount = async (accountId: number) => {
  await prisma.cTraderAccount.update({
    where: { id: accountId },
    data: { status: 'burned' },
  })
}

const burnStatuses = new Set(['failed', 'violated', 'breached', 'completed', 'passed'])
const AFFILIATE_COMMISSION_PERCENT = 10

const createAffiliateCommission = async (tx: Prisma.TransactionClient, order: { id: number; affiliateId?: number | null; netAmountKobo: number }) => {
  const resolvedAffiliateId = order.affiliateId ?? null
  if (!resolvedAffiliateId) return

  const affiliateCommissionClient = (tx as typeof prisma).affiliateCommission
  const existing = await affiliateCommissionClient.findFirst({
    where: { orderId: order.id },
  })

  if (existing) return

  const commissionAmount = Math.round(order.netAmountKobo * (AFFILIATE_COMMISSION_PERCENT / 100))

  await affiliateCommissionClient.create({
    data: {
      orderId: order.id,
      affiliateId: resolvedAffiliateId,
      amountKobo: commissionAmount,
      status: 'earned',
    },
  })
}

const formatCurrency = (amountKobo: number) =>
  `$${(amountKobo / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

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

    if (burnStatuses.has(status.toLowerCase())) {
      await maybeBurnAccount(account.id)
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

    await prisma.cTraderAccount.update({
      where: { id: account.id },
      data: {
        status: status?.toLowerCase() === 'granted' ? 'active' : account.status,
        accessStatus: status?.toLowerCase() === 'granted' ? 'granted' : 'revoked',
        accessGrantedAt: status?.toLowerCase() === 'granted' ? new Date() : null,
      },
    })

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
        net_amount_formatted: `$${(order.netAmountKobo / 100).toLocaleString('en-US')}`,
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
    const { plan_id, account_size, amount_kobo, coupon_code, challenge_type, phase } = req.body as {
      plan_id?: string
      account_size?: string
      amount_kobo?: number
      coupon_code?: string | null
      challenge_type?: string
      phase?: string
    }
    const rawAffiliateId = req.header('x-affiliate-id')
    const affiliateId = rawAffiliateId
      ? Number(Array.isArray(rawAffiliateId) ? rawAffiliateId[0] : rawAffiliateId)
      : (req.body as { affiliate_id?: number }).affiliate_id

    if (!plan_id || !account_size || !amount_kobo || !challenge_type || !phase) {
      throw new ApiError('plan_id, account_size, amount_kobo, challenge_type, and phase are required', 400)
    }

    const providerOrderId = `MF-${Date.now()}-${Math.floor(Math.random() * 9999)}`

    const couponResult = await applyCouponToOrder({
      code: coupon_code ?? null,
      planId: plan_id,
      amountKobo: amount_kobo,
      userId: user.id,
    })

    const fxConfig = await getFxRatesConfig()
    const usdAmount = couponResult.finalAmountKobo / 100
    const usdToNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
    const ngnAmount = Math.round(usdAmount * usdToNgnRate)

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
        currency: 'USD',
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
        safehavenAccountId: virtualAccount._id,
        safehavenAccountNumber: resolvedAccountNumber,
        safehavenAccountName: resolvedAccountName,
        safehavenBankName: resolvedBankName,
        safehavenExpiresAt: virtualAccount.expiryDate ? new Date(virtualAccount.expiryDate) : null,
        safehavenSessionId: virtualAccount.sessionId ?? null,
        metadata: {
          safehaven: virtualAccount,
        },
        userId: user.id,
        affiliateId: affiliateId && !Number.isNaN(affiliateId) && affiliateId !== user.id ? affiliateId : null,
      } as Prisma.OrderUncheckedCreateInput,
    })

    res.json({
      provider_order_id: order.providerOrderId,
      status: order.status,
      assignment_status: order.assignmentStatus,
      currency: order.currency,
      gross_amount_kobo: order.grossAmountKobo,
      discount_amount_kobo: order.discountAmountKobo,
      net_amount_kobo: order.netAmountKobo,
      bank_transfer_amount_ngn: resolvedAmount,
      bank_transfer_rate: usdToNgnRate,
      bank_transfer_bank_code: resolvedBankCode,
      plan_id: order.planId,
      account_size: order.accountSize,
      challenge_type: order.challengeType,
      phase: order.phase,
      coupon_code: order.couponCode,
      checkout_url: order.checkoutUrl,
      payer_bank_name: resolvedBankName || order.safehavenBankName,
      payer_account_name: resolvedAccountName || order.safehavenAccountName,
      payer_virtual_acc_no: resolvedAccountNumber || order.safehavenAccountNumber,
      expires_at: order.safehavenExpiresAt?.toISOString() ?? null,
      challenge_id: null,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const createCryptoOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { plan_id, account_size, amount_kobo, crypto_currency, challenge_type, phase, coupon_code } = req.body as {
      plan_id?: string
      account_size?: string
      amount_kobo?: number
      crypto_currency?: keyof typeof CRYPTO_ADDRESSES
      challenge_type?: string
      phase?: string
      coupon_code?: string | null
    }
    const rawAffiliateId = req.header('x-affiliate-id')
    const affiliateId = rawAffiliateId
      ? Number(Array.isArray(rawAffiliateId) ? rawAffiliateId[0] : rawAffiliateId)
      : (req.body as { affiliate_id?: number }).affiliate_id

    if (!plan_id || !account_size || !amount_kobo || !crypto_currency || !challenge_type || !phase) {
      throw new ApiError('plan_id, account_size, amount_kobo, crypto_currency, challenge_type, and phase are required', 400)
    }

    const normalizedCurrency = crypto_currency.toUpperCase() as keyof typeof CRYPTO_ADDRESSES
    if (!(normalizedCurrency in CRYPTO_ADDRESSES)) {
      throw new ApiError('Unsupported crypto currency', 400)
    }

    const address = resolveCryptoAddress(normalizedCurrency)
    if (!address) {
      throw new ApiError('Unsupported crypto currency', 400)
    }

    const providerOrderId = `CRYPTO-${Date.now()}-${Math.floor(Math.random() * 9999)}`

    const couponResult = await applyCouponToOrder({
      code: coupon_code ?? null,
      planId: plan_id,
      amountKobo: amount_kobo,
      userId: user.id,
    })
    const order = await prisma.order.create({
      data: {
        providerOrderId,
        status: 'pending',
        assignmentStatus: 'unassigned',
        currency: 'USD',
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
        cryptoCurrency: normalizedCurrency,
        cryptoAddress: address,
        userId: user.id,
        affiliateId: affiliateId && !Number.isNaN(affiliateId) && affiliateId !== user.id ? affiliateId : null,
      } as Prisma.OrderUncheckedCreateInput,
    })

    res.json({
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
          ...(affiliateId !== undefined ? { affiliateId } : {}),
          netAmountKobo: nextOrder.netAmountKobo,
        })
      }

      return nextOrder
    })

    let onboardingCertificateUrl: string | null = null
    let certificateAttachments: Array<{ filename: string; content: Buffer; contentType?: string }> | undefined
    if (mapped === 'completed') {
      try {
        const certificate = await createOnboardingCertificate({
          userId: updatedOrder.userId,
          orderId: updatedOrder.id,
          challengeType: updatedOrder.challengeType,
          phase: updatedOrder.phase,
          accountSize: updatedOrder.accountSize,
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

    if (mapped === 'completed') {
      const user = await prisma.user.findUnique({ where: { id: updatedOrder.userId } })
      if (user?.email) {
        try {
          const objectives = await buildObjectiveFields({
            accountSize: updatedOrder.accountSize,
            challengeType: updatedOrder.challengeType ?? 'two_step',
            phase: updatedOrder.phase ?? 'phase_1',
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

          await sendUnifiedEmail({
            to: user.email,
            subject: 'Your purchase receipt & trading objectives',
            title: 'Challenge Purchase Confirmed',
            subtitle: 'Your trading objectives are ready',
            content: `Thank you for your purchase! Your ${updatedOrder.accountSize} ${updatedOrder.challengeType ?? 'two_step'} challenge has been confirmed. Please review your receipt and objectives below.`,
            buttonText: 'View Dashboard',
            infoBox: [
              `Receipt: ${formatCurrency(updatedOrder.netAmountKobo)} (${updatedOrder.paymentMethod ?? 'payment'})`,
              `Order ID: ${updatedOrder.providerOrderId ?? updatedOrder.id}`,
              `Status: ${updatedOrder.status}`,
              `Objectives: ${objectivesLines.length ? objectivesLines.join(' | ') : 'Check your dashboard for objectives.'}`,
            ].join('<br>'),
            ...(certificateAttachments ? { attachments: certificateAttachments } : {}),
          })
        } catch (error) {
          console.error('Failed to send purchase email', error)
        }
      }
    }

    if (mapped === 'completed' && updatedOrder.assignmentStatus !== 'assigned') {
      const normalizedAccountSize = order.accountSize
        .replace(/\$|,/g, '')
        .replace(/k$/i, '000')
        .replace(/\s+/g, '')

      const assigned = await assignReadyAccount(order.userId, {
        challengeType: order.challengeType ?? 'challenge',
        phase: order.phase ?? 'phase_1',
        accountSize: normalizedAccountSize ? `$${normalizedAccountSize}` : order.accountSize,
      })

      if (assigned) {
        await prisma.order.update({
          where: { id: order.id },
          data: { assignmentStatus: 'assigned' },
        })

        await requestAccountAccess({
          user_email: (await prisma.user.findUnique({ where: { id: order.userId } }))?.email ?? '',
          account_number: assigned.accountNumber,
          broker: assigned.brokerName,
          platform: 'ctrader',
        })
      } else {
        await prisma.order.update({
          where: { id: order.id },
          data: { assignmentStatus: 'pending_assign' },
        })
      }
    }

    res.json({ received: true })
  } catch (err) {
    next(err as Error)
  }
}