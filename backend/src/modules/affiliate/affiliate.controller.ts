import { Request, Response, NextFunction } from 'express'
import { paginationSchema } from '../../common/validation'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { getFxRatesConfig } from '../fxRates/fxRates.service'
import { SAFEHAVEN_BANKS } from '../kyc/kyc.banks'
import { ApiError } from '../../common/errors'
import { createTransfer, resolveAccountName } from '../../services/safehaven.service'

type AuthRequest = Request & { user?: { id: number; email: string } }

type AffiliateScope = 'trader' | 'attic'

const AFFILIATE_CONFIG_KEY = 'affiliate_config'
const DEFAULT_AFFILIATE_COMMISSION_PERCENT = 30

const AUTO_AFFILIATE_PAYOUT_MAX_NGN = 50000

const getAffiliateConfig = async () => {
  const existing = await prisma.tradingObjectiveConfig.findUnique({
    where: { key: AFFILIATE_CONFIG_KEY },
  })

  if (existing) {
    const rules = (existing.rules as { commission_percent?: number }) ?? {}
    return {
      id: existing.id,
      key: existing.key,
      label: existing.label,
      rules: {
        commission_percent: Number(rules.commission_percent ?? DEFAULT_AFFILIATE_COMMISSION_PERCENT),
      },
      updated_at: existing.updatedAt,
    }
  }

  const created = await prisma.tradingObjectiveConfig.create({
    data: {
      key: AFFILIATE_CONFIG_KEY,
      label: 'Affiliate Config',
      rules: { commission_percent: DEFAULT_AFFILIATE_COMMISSION_PERCENT },
    },
  })

  return {
    id: created.id,
    key: created.key,
    label: created.label,
    rules: { commission_percent: DEFAULT_AFFILIATE_COMMISSION_PERCENT },
    updated_at: created.updatedAt,
  }
}

export const getAffiliateCommissionPercent = async () => {
  const config = await getAffiliateConfig()
  return Number(config.rules.commission_percent ?? DEFAULT_AFFILIATE_COMMISSION_PERCENT)
}

export const updateAffiliateCommissionConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commissionPercent = Number(req.body?.commission_percent)
    if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
      throw new ApiError('commission_percent must be a number between 0 and 100', 400)
    }

    const updated = await prisma.tradingObjectiveConfig.upsert({
      where: { key: AFFILIATE_CONFIG_KEY },
      create: {
        key: AFFILIATE_CONFIG_KEY,
        label: 'Affiliate Config',
        rules: { commission_percent: commissionPercent },
      },
      update: {
        rules: { commission_percent: commissionPercent },
      },
    })

    res.json({
      id: updated.id,
      key: updated.key,
      label: updated.label,
      rules: updated.rules,
      updated_at: updated.updatedAt,
    })
  } catch (err) {
    next(err as Error)
  }
}

const logAffiliatePayout = (message: string, meta?: Record<string, unknown>) => {
  console.log('[affiliate-payout]', message, meta ?? {})
}

const getAffiliateClients = () => {
  const client = prisma as typeof prisma & {
    affiliateCommission?: any
    affiliatePayout?: any
  }
  return {
    affiliateCommissionClient: client.affiliateCommission,
    affiliatePayoutClient: client.affiliatePayout,
  }
}

const ensureUser = (req: AuthRequest) => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }
  return req.user
}

const resolveAffiliateScope = (req: Request): AffiliateScope => {
  const raw = String(req.query.scope ?? '').toLowerCase()
  return raw === 'attic' ? 'attic' : 'trader'
}

const resolveAffiliateDisplayCurrency = (req: Request): 'USD' | 'NGN' => {
  const raw = String(req.query.currency ?? '').toUpperCase()
  return raw === 'NGN' ? 'NGN' : 'USD'
}

const buildReferralLink = (affiliateId: number, scope: AffiliateScope) =>
  scope === 'attic'
    ? `https://attic.machefunded.com/ref/${affiliateId}`
    : `https://trader.machefunded.com/ref/${affiliateId}`

const buildOrderScopeWhere = (scope: AffiliateScope) => (
  scope === 'attic'
    ? { challengeType: 'attic' }
    : { NOT: { challengeType: 'attic' } }
)

const buildCommissionScopeWhere = (affiliateId: number, scope: AffiliateScope) => ({
  affiliateId,
  order: buildOrderScopeWhere(scope),
})

const buildActiveCommissionScopeWhere = (affiliateId: number, scope: AffiliateScope) => ({
  ...buildCommissionScopeWhere(affiliateId, scope),
  status: { in: ['earned', 'paid'] },
})

const resolveCommissionsToReverse = async (
  tx: typeof prisma,
  affiliateId: number,
  payoutAmountKobo: number,
  requestedAt: Date,
) => {
  const commissions = await (tx as any).affiliateCommission.findMany({
    where: {
      affiliateId,
      status: 'earned',
      createdAt: { lte: requestedAt },
    },
    orderBy: { createdAt: 'asc' },
  }) as Array<{ id: number; amountKobo: number; createdAt: Date }>

  const selected: number[] = []
  let runningTotal = 0

  for (const commission of commissions) {
    if (runningTotal >= payoutAmountKobo) break
    selected.push(commission.id)
    runningTotal += commission.amountKobo
  }

  if (runningTotal !== payoutAmountKobo) {
    throw new ApiError(
      `Unable to reverse commissions exactly for payout amount. Expected ${payoutAmountKobo}, found ${runningTotal}.`,
      400,
    )
  }

  return selected
}

const resolveStoredNameEnquiryReference = (user: {
  payoutBankCode?: string | null
  payoutAccountNumber?: string | null
  payoutSafeHavenReference?: string | null
}, bankCode?: string | null, accountNumber?: string | null) => {
  if (!user.payoutSafeHavenReference) return null
  if (user.payoutBankCode !== bankCode) return null
  if (user.payoutAccountNumber !== accountNumber) return null
  return user.payoutSafeHavenReference
}

const attemptAutoAffiliateBankPayout = async (params: {
  payoutId: number
  affiliateId: number
  amountKobo: number
  payoutMethodType?: string | null
  payoutBankCode?: string | null
  payoutAccountNumber?: string | null
  payoutAccountName?: string | null
  affiliateProfile: {
    email: string
    payoutBankCode?: string | null
    payoutAccountNumber?: string | null
    payoutSafeHavenReference?: string | null
  }
}) => {
  const normalizedMethod = String(params.payoutMethodType ?? '').toLowerCase()
  if (normalizedMethod !== 'bank_transfer') {
    logAffiliatePayout('auto payout skipped: non-bank method', {
      payoutId: params.payoutId,
      method: params.payoutMethodType,
    })
    return { attempted: false as const, reason: 'not_bank_transfer' as const }
  }

  if (!params.payoutBankCode || !params.payoutAccountNumber) {
    logAffiliatePayout('auto payout skipped: missing bank details', { payoutId: params.payoutId })
    return { attempted: false as const, reason: 'missing_bank_details' as const }
  }

  if (!env.safehavenAffiliateDebitAccount) {
    logAffiliatePayout('auto payout skipped: missing affiliate debit account env', { payoutId: params.payoutId })
    return { attempted: false as const, reason: 'missing_debit_account' as const }
  }

  const fxConfig = await getFxRatesConfig()
  const usdNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
  const amountUsd = params.amountKobo / 100
  const amountNgn = Math.round(amountUsd * usdNgnRate)

  if (amountNgn > AUTO_AFFILIATE_PAYOUT_MAX_NGN) {
    logAffiliatePayout('auto payout skipped: above threshold', {
      payoutId: params.payoutId,
      amountNgn,
      threshold: AUTO_AFFILIATE_PAYOUT_MAX_NGN,
    })
    return { attempted: false as const, reason: 'above_threshold' as const, amountNgn }
  }

  try {
    logAffiliatePayout('auto payout attempting transfer', {
      payoutId: params.payoutId,
      affiliateId: params.affiliateId,
      amountKobo: params.amountKobo,
      amountNgn,
      bankCode: params.payoutBankCode,
      accountNumber: params.payoutAccountNumber,
      usedStoredReference: Boolean(resolveStoredNameEnquiryReference(
        params.affiliateProfile,
        params.payoutBankCode,
        params.payoutAccountNumber,
      )),
    })

    const storedReference = resolveStoredNameEnquiryReference(
      params.affiliateProfile,
      params.payoutBankCode,
      params.payoutAccountNumber,
    )

    const enquiryReference = storedReference || (() => null)()
    const nameEnquiryReference = enquiryReference ?? await (async () => {
      const enquiry = await resolveAccountName({
        bankCode: params.payoutBankCode!,
        accountNumber: params.payoutAccountNumber!,
      })

      return enquiry.data?.sessionId ?? enquiry.data?.reference ?? null
    })()

    if (!nameEnquiryReference) {
      throw new Error('SafeHaven name enquiry did not return a usable reference')
    }

    const paymentReference = `AFF-${params.payoutId}-${Date.now()}`
    const transferResponse = await createTransfer({
      nameEnquiryReference,
      debitAccountNumber: env.safehavenAffiliateDebitAccount,
      beneficiaryBankCode: params.payoutBankCode,
      beneficiaryAccountNumber: params.payoutAccountNumber,
      amount: amountNgn,
      saveBeneficiary: false,
      narration: `Affiliate payout ${params.affiliateId}`,
      paymentReference,
    })

    const normalizedResponseCode = String(transferResponse.responseCode ?? '').trim()
    const normalizedTransferStatus = String(transferResponse.data?.status ?? '').trim().toLowerCase()
    const transferSucceeded = normalizedResponseCode === '00'
      && (!normalizedTransferStatus || ['completed', 'success', 'successful', 'approved'].includes(normalizedTransferStatus))

    if (!transferSucceeded) {
      throw new Error(
        `SafeHaven transfer was not successful (${normalizedResponseCode || 'no_code'}: ${transferResponse.message ?? 'Unknown error'})`
      )
    }

    logAffiliatePayout('auto payout transfer accepted', {
      payoutId: params.payoutId,
      amountNgn,
      responseCode: transferResponse.responseCode ?? null,
      message: transferResponse.message ?? null,
      transferStatus: transferResponse.data?.status ?? null,
      transferReference: transferResponse.data?.reference ?? transferResponse.data?.transactionReference ?? null,
    })

    const updated = await prisma.$transaction(async (tx) => {
      const payoutUpdate = await (tx as any).affiliatePayout.update({
        where: { id: params.payoutId },
        data: {
          status: 'completed',
          approvedAt: new Date(),
          approvedBy: 'system_safehaven_auto',
        },
      })

      await (tx as any).affiliateCommission.updateMany({
        where: { affiliateId: params.affiliateId, status: 'earned' },
        data: { status: 'paid', paidAt: new Date() },
      })

      return payoutUpdate
    })

    return {
      attempted: true as const,
      success: true as const,
      payout: updated,
      amountNgn,
    }
  } catch (error) {
    console.error('[affiliate-payout] auto payout failed; falling back to manual flow', {
      payoutId: params.payoutId,
      affiliateId: params.affiliateId,
      amountKobo: params.amountKobo,
      amountNgn,
      bankCode: params.payoutBankCode,
      accountNumber: params.payoutAccountNumber,
      error: error instanceof Error ? error.message : error,
    })

    return {
      attempted: true as const,
      success: false as const,
      amountNgn,
      errorMessage: error instanceof Error ? error.message : 'Transfer failed',
    }
  }
}

export const getAffiliateDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = resolveAffiliateScope(req)
    const displayCurrency = resolveAffiliateDisplayCurrency(req)
    const fxConfig = await getFxRatesConfig()
    const usdNgnRate = Number(fxConfig.rules?.usd_ngn_rate ?? 1300)
    const convertUsdAmount = (amountUsd: number) => displayCurrency === 'NGN'
      ? Number((amountUsd * usdNgnRate).toFixed(2))
      : Number(amountUsd.toFixed(2))
    const { affiliateCommissionClient, affiliatePayoutClient } = getAffiliateClients()
    if (!affiliateCommissionClient?.aggregate || !affiliatePayoutClient?.findMany) {
      const affiliateCommissionPercent = await getAffiliateCommissionPercent()
      res.json({
        referral_link: buildReferralLink(ensureUser(req).id, scope),
        commission_percent: affiliateCommissionPercent,
        display_currency: displayCurrency,
        stats: { available_balance: 0, total_earned: 0, referrals: 0, impressions: 0 },
        rewards: [],
        recent_transactions: [],
        recent_payouts: [],
        bank_details: null,
        payout_method_type: null,
      })
      return
    }

    const user = ensureUser(req)
    const affiliateId = user.id
    const affiliateCommissionPercent = await getAffiliateCommissionPercent()

    const [earned, paid, payoutRequests, recentCommissions, recentPayouts, affiliateProfile] = await Promise.all([
      affiliateCommissionClient.aggregate({
        _sum: { amountKobo: true },
        where: buildActiveCommissionScopeWhere(affiliateId, scope),
      }),
      affiliateCommissionClient.aggregate({
        _sum: { amountKobo: true },
        where: { ...buildCommissionScopeWhere(affiliateId, scope), status: 'paid' },
      }),
      affiliatePayoutClient.findMany({
        where: { affiliateId },
        orderBy: { requestedAt: 'desc' },
      }),
      affiliateCommissionClient.findMany({
        where: buildCommissionScopeWhere(affiliateId, scope),
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { order: true },
      }),
      affiliatePayoutClient.findMany({
        where: { affiliateId },
        orderBy: { requestedAt: 'desc' },
        take: 4,
      }),
      prisma.user.findUnique({ where: { id: affiliateId } }),
    ])

    if (!affiliateProfile) {
      throw new ApiError('Affiliate not found', 404)
    }

    const totalEarned = earned._sum.amountKobo ?? 0
    const totalPaid = paid._sum.amountKobo ?? 0
    const pendingPayouts = (payoutRequests as Array<{ status: string; amountKobo: number }>)
      .filter((payout) => payout.status === 'pending')
      .reduce((sum, payout) => sum + payout.amountKobo, 0)
    const availableBalance = Math.max(0, totalEarned - totalPaid - pendingPayouts)

    res.json({
      referral_link: buildReferralLink(affiliateId, scope),
      commission_percent: affiliateCommissionPercent,
      display_currency: displayCurrency,
      stats: {
        available_balance: convertUsdAmount(availableBalance / 100),
        total_earned: convertUsdAmount(totalEarned / 100),
        referrals: await (prisma as any).order.count({ where: { affiliateId, ...buildOrderScopeWhere(scope) } }),
        impressions: 0,
      },
      rewards: [],
      recent_transactions: (recentCommissions as Array<{ createdAt: Date; amountKobo: number; orderId: number }>).map((commission) => ({
        date: commission.createdAt.toISOString(),
        type: 'Referral Commission',
        commission: convertUsdAmount(commission.amountKobo / 100),
        order_id: commission.orderId,
      })),
      recent_payouts: (recentPayouts as Array<{ requestedAt: Date; status: string; amountKobo: number }>).map((payout) => ({
        date: payout.requestedAt.toISOString(),
        status: payout.status,
        amount: convertUsdAmount(payout.amountKobo / 100),
      })),
      bank_details: affiliateProfile.payoutAccountNumber
        ? {
          bank_name: affiliateProfile.payoutBankName ?? '',
          account_name: affiliateProfile.payoutAccountName ?? '',
          account_number: affiliateProfile.payoutAccountNumber ?? '',
        }
        : null,
      payout_method_type: affiliateProfile.payoutMethodType ?? null,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listAffiliateCommissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = resolveAffiliateScope(req)
    const { affiliateCommissionClient } = getAffiliateClients()
    if (!affiliateCommissionClient?.findMany) {
      res.json({ commissions: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } })
      return
    }

    const user = ensureUser(req)
    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 20)
    const skip = (page - 1) * limit

    const [commissions, total] = await Promise.all([
      affiliateCommissionClient.findMany({
        where: buildCommissionScopeWhere(user.id, scope),
        include: { order: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      affiliateCommissionClient.count({ where: buildCommissionScopeWhere(user.id, scope) }),
    ])

    res.json({
      commissions: (commissions as Array<{ id: number; createdAt: Date; orderId: number; amountKobo: number; status: string; order?: { userId?: number | null; planId?: string | null } }>).map((commission) => ({
        id: commission.id,
        date: commission.createdAt.toISOString(),
        affiliate: user.email,
        order_id: commission.orderId,
        customer: commission.order?.userId ?? null,
        amount: commission.amountKobo / 100,
        status: commission.status,
        product_summary: commission.order?.planId ?? null,
      })),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listAffiliatePayouts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { affiliatePayoutClient } = getAffiliateClients()
    if (!affiliatePayoutClient?.findMany) {
      res.json({ payouts: [] })
      return
    }

    const user = ensureUser(req)
    const payouts = await affiliatePayoutClient.findMany({
      where: { affiliateId: user.id },
      orderBy: { requestedAt: 'desc' },
    })

    res.json({
      payouts: (payouts as Array<{ id: number; requestedAt: Date; status: string; amountKobo: number }>).map((payout) => ({
        id: payout.id,
        date: payout.requestedAt.toISOString(),
        status: payout.status,
        amount: payout.amountKobo / 100,
      })),
    })
  } catch (err) {
    next(err as Error)
  }
}

export const requestAffiliatePayout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = resolveAffiliateScope(req)
    const { affiliateCommissionClient, affiliatePayoutClient } = getAffiliateClients()
    if (!affiliateCommissionClient?.aggregate || !affiliatePayoutClient?.findMany) {
      throw new ApiError('Affiliate payouts are not configured yet. Please try again later.', 500)
    }

    const user = ensureUser(req)
    const affiliateProfile = await prisma.user.findUnique({ where: { id: user.id } })
    if (!affiliateProfile) {
      throw new ApiError('Affiliate not found', 404)
    }

    if (!affiliateProfile.payoutMethodType) {
      throw new ApiError('Please configure a payout method in settings.', 400)
    }

    const totals = await affiliateCommissionClient.aggregate({
      _sum: { amountKobo: true },
      where: buildActiveCommissionScopeWhere(user.id, scope),
    })
    const paidTotals = await affiliateCommissionClient.aggregate({
      _sum: { amountKobo: true },
      where: { ...buildCommissionScopeWhere(user.id, scope), status: 'paid' },
    })
    const pendingPayouts = await affiliatePayoutClient.findMany({
      where: { affiliateId: user.id, status: 'pending' },
    })

    const totalEarned = totals._sum.amountKobo ?? 0
    const totalPaid = paidTotals._sum.amountKobo ?? 0
    const pendingAmount = (pendingPayouts as Array<{ amountKobo: number }>).reduce((sum, payout) => sum + payout.amountKobo, 0)
    const availableBalance = totalEarned - totalPaid - pendingAmount

    if (availableBalance <= 0) {
      throw new ApiError('No available balance to withdraw.', 400)
    }

    const payout = await affiliatePayoutClient.create({
      data: {
        affiliateId: user.id,
        amountKobo: availableBalance,
        status: 'pending',
        payoutMethodType: affiliateProfile.payoutMethodType,
        payoutBankName: affiliateProfile.payoutBankName,
        payoutBankCode: affiliateProfile.payoutBankCode,
        payoutAccountNumber: affiliateProfile.payoutAccountNumber,
        payoutAccountName: affiliateProfile.payoutAccountName,
        payoutCryptoCurrency: affiliateProfile.payoutCryptoCurrency,
        payoutCryptoAddress: affiliateProfile.payoutCryptoAddress,
        payoutCryptoFirstName: affiliateProfile.payoutCryptoFirstName,
        payoutCryptoLastName: affiliateProfile.payoutCryptoLastName,
      },
    })

    let finalPayout = payout
    let message = 'Affiliate payout request submitted.'

    logAffiliatePayout('payout request created', {
      payoutId: payout.id,
      affiliateId: user.id,
      amountKobo: payout.amountKobo,
      payoutMethodType: affiliateProfile.payoutMethodType,
      bankCode: affiliateProfile.payoutBankCode,
      accountNumber: affiliateProfile.payoutAccountNumber,
    })

    const autoPayoutResult = await attemptAutoAffiliateBankPayout({
      payoutId: payout.id,
      affiliateId: user.id,
      amountKobo: payout.amountKobo,
      payoutMethodType: affiliateProfile.payoutMethodType,
      payoutBankCode: affiliateProfile.payoutBankCode,
      payoutAccountNumber: affiliateProfile.payoutAccountNumber,
      payoutAccountName: affiliateProfile.payoutAccountName,
      affiliateProfile,
    })

    if (autoPayoutResult.attempted && autoPayoutResult.success) {
      finalPayout = autoPayoutResult.payout as typeof payout
      message = 'Affiliate payout processed automatically.'
      logAffiliatePayout('payout completed automatically', {
        payoutId: finalPayout.id,
        status: finalPayout.status,
      })
    } else if (autoPayoutResult.attempted && !autoPayoutResult.success) {
      message = 'Automatic payout failed, so your payout has been queued for manual processing.'
      logAffiliatePayout('payout left pending after auto failure', {
        payoutId: payout.id,
        reason: autoPayoutResult.errorMessage,
      })
    } else if (autoPayoutResult.reason === 'above_threshold') {
      message = 'Affiliate payout request submitted for manual processing.'
      logAffiliatePayout('payout left pending for manual processing', {
        payoutId: payout.id,
        reason: autoPayoutResult.reason,
        amountNgn: autoPayoutResult.amountNgn,
      })
    }

    res.json({
      id: finalPayout.id,
      status: finalPayout.status,
      amount: finalPayout.amountKobo / 100,
      message,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listAdminAffiliateOverview = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { affiliateCommissionClient, affiliatePayoutClient } = getAffiliateClients()
    if (!affiliateCommissionClient?.aggregate || !affiliatePayoutClient?.findMany) {
      res.json({
        total_affiliates: 0,
        total_commissions: 0,
        total_paid_out: 0,
        total_auto_paid_out_today: 0,
        commission_percent: DEFAULT_AFFILIATE_COMMISSION_PERCENT,
        pending_payouts_count: 0,
        pending_payouts_sum: 0,
        pending_milestones: 0,
        unique_purchasers: 0,
      })
      return
    }

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [totalAffiliates, totalCommissions, totalPaid, pendingPayouts, autoPaidToday, fxConfig, affiliateCommissionPercent] = await Promise.all([
      affiliateCommissionClient.findMany({ select: { affiliateId: true }, distinct: ['affiliateId'] }),
      affiliateCommissionClient.aggregate({ _sum: { amountKobo: true } }),
      affiliateCommissionClient.aggregate({ _sum: { amountKobo: true }, where: { status: 'paid' } }),
      affiliatePayoutClient.findMany({ where: { status: 'pending' } }),
      affiliatePayoutClient.aggregate({
        _sum: { amountKobo: true },
        where: {
          status: 'completed',
          approvedBy: 'system_safehaven_auto',
          approvedAt: { gte: startOfToday },
        },
      }),
      getFxRatesConfig(),
      getAffiliateCommissionPercent(),
    ])

    const pendingSum = (pendingPayouts as Array<{ amountKobo: number }>).reduce((sum, payout) => sum + payout.amountKobo, 0)

    const uniquePurchasers = await prisma.order.groupBy({
      by: ['userId'],
      where: { affiliateId: { not: null } },
    })

    const usdNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
    const autoPaidTodayNgn = Math.round(((autoPaidToday._sum.amountKobo ?? 0) / 100) * usdNgnRate)

    res.json({
      total_affiliates: totalAffiliates.length,
      total_commissions: (totalCommissions._sum.amountKobo ?? 0) / 100,
      total_paid_out: (totalPaid._sum.amountKobo ?? 0) / 100,
      total_auto_paid_out_today: autoPaidTodayNgn,
      commission_percent: affiliateCommissionPercent,
      pending_payouts_count: pendingPayouts.length,
      pending_payouts_sum: pendingSum / 100,
      pending_milestones: 0,
      unique_purchasers: uniquePurchasers.length,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listAdminAffiliateCommissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { affiliateCommissionClient } = getAffiliateClients()
    if (!affiliateCommissionClient?.findMany) {
      res.json({ commissions: [], pagination: { page: 1, limit: 50, total: 0, pages: 1 } })
      return
    }

    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 50)
    const skip = (page - 1) * limit

    const [commissions, total] = await Promise.all([
      affiliateCommissionClient.findMany({
        include: { affiliate: true, order: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      affiliateCommissionClient.count(),
    ])

    res.json({
      commissions: (commissions as Array<{ id: number; createdAt: Date; orderId: number; amountKobo: number; status: string; affiliate: { fullName?: string | null; email: string }; order?: { user?: { email?: string | null } | null; planId?: string | null } }>).map((commission) => ({
        id: commission.id,
        date: commission.createdAt.toISOString(),
        affiliate: commission.affiliate.fullName ?? commission.affiliate.email,
        order_id: commission.orderId,
        customer: commission.order?.user?.email ?? null,
        amount: commission.amountKobo / 100,
        status: commission.status,
        product_summary: commission.order?.planId ?? null,
      })),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listAdminAffiliatePayouts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { affiliatePayoutClient } = getAffiliateClients()
    if (!affiliatePayoutClient?.findMany) {
      res.json({ payouts: [], pagination: { page: 1, limit: 50, total: 0, pages: 1 } })
      return
    }

    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 50)
    const skip = (page - 1) * limit

    const [payouts, total, fxConfig] = await Promise.all([
      affiliatePayoutClient.findMany({
        include: { affiliate: true },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      affiliatePayoutClient.count(),
      getFxRatesConfig(),
    ])

    const usdNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300

    res.json({
      payouts: (payouts as Array<{
        id: number
        amountKobo: number
        status: string
        requestedAt: Date
        approvedAt?: Date | null
        affiliate: {
          fullName?: string | null
          email: string
          payoutMethodType?: string | null
          payoutBankName?: string | null
          payoutBankCode?: string | null
          payoutAccountNumber?: string | null
          payoutAccountName?: string | null
          payoutCryptoCurrency?: string | null
          payoutCryptoAddress?: string | null
          payoutCryptoFirstName?: string | null
          payoutCryptoLastName?: string | null
        }
        payoutMethodType?: string | null
        payoutBankName?: string | null
        payoutBankCode?: string | null
        payoutAccountNumber?: string | null
        payoutAccountName?: string | null
        payoutCryptoCurrency?: string | null
        payoutCryptoAddress?: string | null
        payoutCryptoFirstName?: string | null
        payoutCryptoLastName?: string | null
      }>).map((payout) => {
        const amountUsd = payout.amountKobo / 100
        const amountNgn = Math.round(amountUsd * usdNgnRate)
        const payoutMethodType = payout.payoutMethodType ?? payout.affiliate.payoutMethodType ?? null
        const payoutBankCode = payout.payoutBankCode ?? payout.affiliate.payoutBankCode ?? null
        const resolvedBankName = payoutBankCode
          ? SAFEHAVEN_BANKS.find((bank) => bank.bankCode === payoutBankCode)?.name ?? null
          : null
        const payoutBankName = payout.payoutBankName
          ?? payout.affiliate.payoutBankName
          ?? resolvedBankName
          ?? null
        const payoutAccountNumber = payout.payoutAccountNumber ?? payout.affiliate.payoutAccountNumber ?? null
        const payoutAccountName = payout.payoutAccountName ?? payout.affiliate.payoutAccountName ?? null
        const payoutCryptoCurrency = payout.payoutCryptoCurrency ?? payout.affiliate.payoutCryptoCurrency ?? null
        const payoutCryptoAddress = payout.payoutCryptoAddress ?? payout.affiliate.payoutCryptoAddress ?? null
        const payoutCryptoFirstName = payout.payoutCryptoFirstName ?? payout.affiliate.payoutCryptoFirstName ?? null
        const payoutCryptoLastName = payout.payoutCryptoLastName ?? payout.affiliate.payoutCryptoLastName ?? null
        return {
          id: payout.id,
          affiliate: payout.affiliate.fullName ?? payout.affiliate.email,
          amount: amountUsd,
          amount_usd: amountUsd,
          amount_ngn: amountNgn,
          usd_ngn_rate: usdNgnRate,
          status: payout.status,
          payout_method_type: payoutMethodType,
          payout_bank_name: payoutBankName,
          payout_bank_code: payoutBankCode,
          payout_account_number: payoutAccountNumber,
          payout_account_name: payoutAccountName,
          payout_crypto_currency: payoutCryptoCurrency,
          payout_crypto_address: payoutCryptoAddress,
          payout_crypto_first_name: payoutCryptoFirstName,
          payout_crypto_last_name: payoutCryptoLastName,
          bank_details: payoutMethodType === 'bank'
            ? `${payoutBankName ?? 'Bank'} •••• ${(payoutAccountNumber ?? '').slice(-4)}`
            : `${payoutCryptoCurrency ?? 'Crypto'} •••• ${(payoutCryptoAddress ?? '').slice(-4)}`,
          requested_at: payout.requestedAt.toISOString(),
          approved_at: payout.approvedAt?.toISOString() ?? null,
        }
      }),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (err) {
    next(err as Error)
  }
}

export const approveAffiliatePayout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { affiliateCommissionClient, affiliatePayoutClient } = getAffiliateClients()
    if (!affiliateCommissionClient?.updateMany || !affiliatePayoutClient?.findUnique) {
      throw new ApiError('Affiliate payouts are not configured yet.', 500)
    }

    const payoutId = Number(req.params.id)
    if (!payoutId) {
      throw new ApiError('Payout ID is required', 400)
    }

    const payout = await affiliatePayoutClient.findUnique({ where: { id: payoutId } })
    if (!payout) {
      throw new ApiError('Affiliate payout not found', 404)
    }
    if (payout.status !== 'pending') {
      throw new ApiError('Only pending payouts can be approved', 400)
    }

    const updated = await prisma.$transaction(async (tx) => {
      const payoutUpdate = await (tx as any).affiliatePayout.update({
        where: { id: payoutId },
        data: {
          status: 'completed',
          approvedAt: new Date(),
          approvedBy: (req as AuthRequest).user?.email ?? 'admin',
        },
      })

      await (tx as any).affiliateCommission.updateMany({
        where: { affiliateId: payout.affiliateId, status: 'earned' },
        data: { status: 'paid', paidAt: new Date() },
      })

      return payoutUpdate
    })

    res.json({ id: updated.id, status: updated.status, message: 'Affiliate payout approved.' })
  } catch (err) {
    next(err as Error)
  }
}

export const rejectAffiliatePayout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { affiliatePayoutClient, affiliateCommissionClient } = getAffiliateClients()
    if (!affiliatePayoutClient?.findUnique || !affiliateCommissionClient?.findMany) {
      throw new ApiError('Affiliate payouts are not configured yet.', 500)
    }

    const payoutId = Number(req.params.id)
    const { reason, deductCommission } = req.body as { reason?: string; deductCommission?: boolean }
    if (!payoutId) {
      throw new ApiError('Payout ID is required', 400)
    }

    const payout = await affiliatePayoutClient.findUnique({ where: { id: payoutId } })
    if (!payout) {
      throw new ApiError('Affiliate payout not found', 404)
    }
    if (payout.status !== 'pending') {
      throw new ApiError('Only pending payouts can be rejected', 400)
    }

    const updated = await prisma.$transaction(async (tx) => {
      const payoutUpdate = await (tx as any).affiliatePayout.update({
        where: { id: payoutId },
        data: {
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: (req as AuthRequest).user?.email ?? 'admin',
          rejectionReason: reason ?? 'Rejected by admin',
        },
      })

      if (deductCommission) {
        const commissionIds = await resolveCommissionsToReverse(
          tx as typeof prisma,
          payout.affiliateId,
          payout.amountKobo,
          payout.requestedAt,
        )

        await (tx as any).affiliateCommission.updateMany({
          where: { id: { in: commissionIds } },
          data: {
            status: 'reversed',
            paidAt: null,
          },
        })
      }

      return payoutUpdate
    })

    res.json({
      id: updated.id,
      status: updated.status,
      message: deductCommission
        ? 'Affiliate payout rejected and commission reversed.'
        : 'Affiliate payout rejected.',
    })
  } catch (err) {
    next(err as Error)
  }
}