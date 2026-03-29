import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { buildObjectiveFields, parseAccountSize } from '../ctrader/ctrader.objectives'
import { createPayoutCertificate } from '../../services/certificate.service'
import { getFxRatesConfig } from '../fxRates/fxRates.service'
import { fetchRemoteAttachment, sendUnifiedEmail } from '../../services/email.service'

type AuthRequest = Request & { user?: { id: number; email: string } }

const ensureUser = (req: AuthRequest) => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }
  return req.user
}

const MIN_WITHDRAWAL_AMOUNT = 1

const resolveCurrencyLabel = (currency?: string | null) => {
  const normalized = currency?.toUpperCase() ?? 'USD'
  return normalized === 'NGN' ? 'NGN' : 'USD'
}

const formatMoney = (amount: number, currency?: string | null) => {
  const normalized = currency?.toUpperCase() ?? 'USD'
  if (normalized === 'NGN') {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const toUsdAmount = (amount: number, currency?: string | null, rate?: number | null) => {
  const normalized = currency?.toUpperCase() ?? 'USD'
  if (normalized === 'NGN') {
    const divider = rate && rate > 0 ? rate : 1300
    return amount / divider
  }
  return amount
}

const normalizeChallengeType = (value?: string | null) => {
  if (!value) return 'two_step'
  const normalized = value.toLowerCase().replace(/-/g, '_')
  if (['two_step', 'one_step', 'instant_funded'].includes(normalized)) {
    return normalized
  }
  if (['challenge', 'funded', 'assigned_pending_access'].includes(normalized)) {
    return 'two_step'
  }
  return normalized
}

const resolveScheduleDays = (schedule?: string | null) => {
  const normalized = schedule?.toLowerCase() ?? ''
  if (normalized.includes('bi')) return 14
  if (normalized.includes('week')) return 7
  if (normalized.includes('daily')) return 1
  return 7
}

const computeProfit = (balance: number, initialBalance: number) => Math.max(0, balance - initialBalance)

const buildAccountPayout = async (accountId: number) => {
  const account = await prisma.cTraderAccount.findUnique({
    where: { id: accountId },
    include: { metrics: true },
  })
  if (!account) {
    throw new ApiError('Account not found', 404)
  }

  const metrics = account.metrics

  const challengeType = normalizeChallengeType(account.challengeType)
  const phaseKey = account.phase?.toLowerCase().includes('funded') ? 'funded' : account.phase

  const objectiveFields = await buildObjectiveFields({
    accountSize: account.accountSize,
    challengeType,
    phase: phaseKey,
  })

  const initialBalance = account.initialBalance
    ?? objectiveFields.initialBalance
    ?? parseAccountSize(account.accountSize)
    ?? 0

  if (!metrics) {
    const now = new Date()
    await prisma.cTraderAccountMetric.create({
      data: {
        accountId: account.id,
        balance: initialBalance,
        equity: initialBalance,
        unrealizedPnl: 0,
        maxPermittedLossLeft: initialBalance,
        highestBalance: initialBalance,
        breachBalance: initialBalance,
        profitTargetBalance: initialBalance,
        winRate: 0,
        closedTradesCount: 0,
        winningTradesCount: 0,
        lotsTradedTotal: 0,
        todayClosedPnl: 0,
        todayTradesCount: 0,
        todayLotsTotal: 0,
        minTradingDaysRequired: account.minTradingDaysRequired ?? 0,
        minTradingDaysMet: false,
        stageElapsedHours: 0,
        scalpingViolationsCount: 0,
        dailyStartAt: now,
        dailyHighBalance: initialBalance,
        dailyBreachBalance: initialBalance,
        firstTradeAt: null,
        totalTrades: 0,
        shortDurationViolation: false,
        breachReason: null,
        lastBalance: initialBalance,
        lastEquity: initialBalance,
        capturedAt: now,
      },
    })
  }

  const fallbackBalance = metrics?.balance ?? initialBalance
  const profitRaw = computeProfit(fallbackBalance ?? 0, initialBalance)
  const profitSplitPercent = objectiveFields.profitSplitPercent ?? account.profitSplitPercent ?? 0
  const profitSplitAmount = profitRaw * (profitSplitPercent / 100)

  const lastPayout = await prisma.payout.findFirst({
    where: { accountId: account.id, status: { in: ['processing', 'completed', 'pending_approval'] } },
    orderBy: { requestedAt: 'desc' },
  })

  const scheduleDays = resolveScheduleDays(objectiveFields.withdrawalSchedule)
  const nextEligibleAt = lastPayout
    ? new Date(lastPayout.requestedAt.getTime() + scheduleDays * 24 * 60 * 60 * 1000)
    : null

  return {
    account,
    metrics,
    initialBalance,
    profitRaw,
    profitSplitPercent,
    profitSplitAmount,
    withdrawalSchedule: objectiveFields.withdrawalSchedule,
    scheduleDays,
    nextEligibleAt,
    lastPayout,
  }
}

const mapPayoutMethodDetails = (user: { payoutMethodType?: string | null; payoutBankName?: string | null; payoutBankCode?: string | null; payoutAccountNumber?: string | null; payoutAccountName?: string | null; payoutCryptoCurrency?: string | null; payoutCryptoAddress?: string | null; payoutCryptoFirstName?: string | null; payoutCryptoLastName?: string | null }) => ({
  payout_method_type: user.payoutMethodType,
  payout_bank_name: user.payoutBankName,
  payout_bank_code: user.payoutBankCode,
  payout_account_number: user.payoutAccountNumber,
  payout_account_name: user.payoutAccountName,
  payout_crypto_currency: user.payoutCryptoCurrency,
  payout_crypto_address: user.payoutCryptoAddress,
  payout_crypto_first_name: user.payoutCryptoFirstName,
  payout_crypto_last_name: user.payoutCryptoLastName,
})

const clampNonNegative = (value: number | null | undefined) => Math.max(0, value ?? 0)

export const getPayoutSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      throw new ApiError('User not found', 404)
    }

    const fundedAccounts = await prisma.cTraderAccount.findMany({
      where: {
        userId: user.id,
        status: { in: ['funded', 'active', 'assigned', 'assigned_pending_access'] },
        OR: [
          { phase: { contains: 'funded', mode: 'insensitive' } },
          { status: { in: ['funded', 'active'] } },
          { challengeType: 'instant_funded' },
        ],
      },
      include: { metrics: true },
    })

    const payoutAccounts = await Promise.all(
      fundedAccounts.map(async (account) => {
        const payoutInfo = await buildAccountPayout(account.id)
        const pendingCount = await prisma.payout.count({
          where: { accountId: account.id, status: 'pending_approval' },
        })
        const hasPendingRequest = pendingCount > 0
        const availablePayout = hasPendingRequest ? 0 : payoutInfo.profitSplitAmount

        return {
          account_id: account.id,
          challenge_id: account.challengeId,
          account_size: account.accountSize,
          current_balance: payoutInfo.metrics?.balance ?? payoutInfo.initialBalance,
          available_payout: availablePayout,
          profit_cap_amount: payoutInfo.profitRaw,
          profit_split_percent: payoutInfo.profitSplitPercent,
          minimum_withdrawal_amount: MIN_WITHDRAWAL_AMOUNT,
          withdrawal_count: await prisma.payout.count({
            where: { accountId: account.id, status: { in: ['completed', 'processing'] } },
          }),
          last_withdrawal_at: payoutInfo.lastPayout?.requestedAt?.toISOString() ?? null,
          next_withdrawal_at: payoutInfo.nextEligibleAt?.toISOString() ?? null,
          withdrawal_schedule: payoutInfo.withdrawalSchedule,
          has_pending_request: hasPendingRequest,
        }
      })
    )

    const withdrawals = await prisma.payout.findMany({
      where: { userId: user.id },
      orderBy: { requestedAt: 'desc' },
      include: { account: true },
    })

    const totalAvailable = payoutAccounts.reduce((sum, account) => sum + account.available_payout, 0)
    const totalEarned = payoutAccounts.reduce((sum, account) => sum + account.profit_cap_amount, 0)

    const hasVerifiedBankAccount = Boolean(dbUser.payoutVerifiedAt || dbUser.payoutAccountNumber || dbUser.payoutCryptoAddress)
    const hasAvailablePayout = totalAvailable >= MIN_WITHDRAWAL_AMOUNT
    const isEligible = hasVerifiedBankAccount && hasAvailablePayout && payoutAccounts.length > 0

    res.json({
      total_available_payout: totalAvailable,
      total_earned_all_time: totalEarned,
      funded_accounts: payoutAccounts,
      withdrawal_history: withdrawals.map((withdrawal) => ({
        id: withdrawal.id,
        amount: withdrawal.amountKobo / 100,
        status: withdrawal.status,
        requested_at: withdrawal.requestedAt.toISOString(),
        completed_at: withdrawal.completedAt?.toISOString() ?? null,
        reference: withdrawal.reference,
        mt5_account_number: withdrawal.account?.accountNumber ?? null,
      })),
      eligibility: {
        is_eligible: isEligible,
        has_verified_bank_account: hasVerifiedBankAccount,
        has_available_payout: hasAvailablePayout,
        minimum_payout_amount: MIN_WITHDRAWAL_AMOUNT,
        bank_account_masked: dbUser.payoutAccountNumber ? dbUser.payoutAccountNumber.slice(-4) : null,
        ineligibility_reasons: [
          ...(payoutAccounts.length === 0 ? ['No funded accounts are available for payout.'] : []),
          ...(!hasVerifiedBankAccount ? ['Please save a payout method in Settings.'] : []),
          ...(!hasAvailablePayout ? [`Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT}.`] : []),
        ],
      },
      payout_method: mapPayoutMethodDetails(dbUser),
    })
  } catch (err) {
    next(err as Error)
  }
}

export const requestPayout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { account_id } = req.body as { account_id?: number; pin?: string }
    if (!account_id) {
      throw new ApiError('account_id is required', 400)
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      throw new ApiError('User not found', 404)
    }

    const payoutInfo = await buildAccountPayout(account_id)
    if (payoutInfo.account.userId !== user.id) {
      throw new ApiError('Account does not belong to user', 403)
    }

    if (!payoutInfo.account.status || !['funded', 'active'].includes(payoutInfo.account.status.toLowerCase())) {
      throw new ApiError('Account must be active and funded to request payout.', 400)
    }

    if (payoutInfo.profitSplitAmount < MIN_WITHDRAWAL_AMOUNT) {
      throw new ApiError(`Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT}.`, 400)
    }

    if (payoutInfo.nextEligibleAt && payoutInfo.nextEligibleAt > new Date()) {
      throw new ApiError('Withdrawal schedule not reached yet.', 400)
    }

    const hasPendingRequest = await prisma.payout.count({
      where: { accountId: payoutInfo.account.id, status: 'pending_approval' },
    })
    if (hasPendingRequest) {
      throw new ApiError('A withdrawal request is already pending for this account.', 400)
    }

    if (!dbUser.payoutMethodType) {
      throw new ApiError('Please configure a payout method in settings.', 400)
    }

    const providerRef = `PAYOUT-${Date.now()}-${Math.floor(Math.random() * 9999)}`
    const amountKobo = Math.round(payoutInfo.profitSplitAmount * 100)
    const payoutCurrency = resolveCurrencyLabel(payoutInfo.account.currency)
    const payout = await prisma.payout.create({
      data: {
        providerRef,
        amountKobo,
        status: 'pending_approval',
        profitSplitPercent: payoutInfo.profitSplitPercent,
        profitBaseAmount: payoutInfo.profitRaw,
        profitAmount: payoutInfo.profitSplitAmount,
        payoutMethodType: dbUser.payoutMethodType,
        payoutBankName: dbUser.payoutBankName,
        payoutBankCode: dbUser.payoutBankCode,
        payoutAccountNumber: dbUser.payoutAccountNumber,
        payoutAccountName: dbUser.payoutAccountName,
        payoutCryptoCurrency: dbUser.payoutCryptoCurrency,
        payoutCryptoAddress: dbUser.payoutCryptoAddress,
        payoutCryptoFirstName: dbUser.payoutCryptoFirstName,
        payoutCryptoLastName: dbUser.payoutCryptoLastName,
        userId: user.id,
        accountId: payoutInfo.account.id,
        metadata: {
          withdrawal_schedule: payoutInfo.withdrawalSchedule,
          mt5_account_number: payoutInfo.account.accountNumber,
          currency: payoutCurrency,
        },
      },
    })

    res.json({
      request_id: payout.providerRef ?? payout.id,
      amount: payout.amountKobo / 100,
      status: payout.status,
      estimated_completion: null,
      message: 'Payout request submitted successfully.',
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listAdminPayouts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 50)
    const skip = (page - 1) * limit

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [payouts, total, pendingReview, approvedToday, paidTodayKobo, rejectedCount] = await Promise.all([
      prisma.payout.findMany({
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: true,
          account: true,
        },
      }),
      prisma.payout.count(),
      prisma.payout.count({ where: { status: 'pending_approval' } }),
      prisma.payout.count({ where: { approvedAt: { gte: startOfDay }, status: { in: ['processing', 'completed'] } } }),
      prisma.payout.findMany({
        where: { completedAt: { gte: startOfDay }, status: 'completed' },
        select: { amountKobo: true, account: { select: { currency: true } } },
      }),
      prisma.payout.count({ where: { status: 'failed' } }),
    ])

    const fxConfig = await getFxRatesConfig()
    const usdNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
    const paidTodayAmountUsd = paidTodayKobo.reduce((sum, payout) => {
      const amount = payout.amountKobo / 100
      return sum + toUsdAmount(amount, payout.account?.currency ?? null, usdNgnRate)
    }, 0)
    const paidTodayAmountKobo = Math.round(paidTodayAmountUsd * 100)

    res.json({
      stats: {
        period: 'today',
        pending_review: pendingReview,
        approved_today: approvedToday,
        paid_today_kobo: paidTodayAmountKobo,
        paid_today_formatted: `$${paidTodayAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
        rejected: rejectedCount,
      },
      payouts: payouts.map((payout) => ({
        id: payout.id,
        provider_order_id: payout.providerRef ?? `PAYOUT-${payout.id}`,
        status: payout.status,
        amount_kobo: payout.amountKobo,
        amount_formatted: formatMoney(payout.amountKobo / 100, payout.account?.currency ?? null),
        created_at: payout.requestedAt.toISOString(),
        completed_at: payout.completedAt?.toISOString() ?? null,
        user: {
          id: payout.userId,
          name: payout.user.fullName ?? payout.user.email,
          email: payout.user.email,
        },
        account: {
          challenge_id: payout.account?.challengeId ?? null,
          account_size: payout.account?.accountSize ?? null,
        },
        metadata: {
          payout_method_type: payout.payoutMethodType,
          payout_bank_name: payout.payoutBankName,
          payout_bank_code: payout.payoutBankCode,
          payout_account_number: payout.payoutAccountNumber,
          payout_account_name: payout.payoutAccountName,
          payout_crypto_currency: payout.payoutCryptoCurrency,
          payout_crypto_address: payout.payoutCryptoAddress,
          payout_crypto_first_name: payout.payoutCryptoFirstName,
          payout_crypto_last_name: payout.payoutCryptoLastName,
          profit_split_percent: payout.profitSplitPercent,
          profit_amount: payout.profitAmount,
          profit_base_amount: payout.profitBaseAmount,
          currency: payout.account?.currency ?? null,
          ...((payout.metadata ?? {}) as Record<string, unknown>),
        },
      })),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (err) {
    next(err as Error)
  }
}

export const approvePayoutRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payoutId = Number(req.params.id)
    if (!payoutId) {
      throw new ApiError('Payout ID is required', 400)
    }

    const payout = await prisma.payout.findUnique({ where: { id: payoutId } })
    if (!payout) {
      throw new ApiError('Payout not found', 404)
    }

    if (payout.status !== 'pending_approval') {
      throw new ApiError('Only pending payouts can be approved', 400)
    }

    const completedAt = new Date()
    const updated = await prisma.$transaction(async (tx) => {
      const payoutUpdate = await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: 'completed',
          completedAt,
          approvedAt: completedAt,
          approvedBy: req.user?.email ?? 'admin',
        },
      })

      if (payout.accountId) {
        const adjustmentAmount = payout.profitBaseAmount
          ?? payout.profitAmount
          ?? payout.amountKobo / 100

        await tx.accountAdjustment.create({
          data: {
            accountId: payout.accountId,
            type: 'withdrawal',
            amount: adjustmentAmount,
            reason: `Payout approved: ${payout.providerRef ?? payout.id}`,
          },
        })

        const metrics = await tx.cTraderAccountMetric.findUnique({
          where: { accountId: payout.accountId },
        })

        if (metrics) {
          const adjustment = adjustmentAmount
          const adjustedHighestBalance = clampNonNegative(metrics.highestBalance - adjustment)
          const adjustedDailyHighBalance = clampNonNegative(metrics.dailyHighBalance - adjustment)
          const adjustedBalance = clampNonNegative(metrics.balance - adjustment)
          const adjustedEquity = clampNonNegative(metrics.equity - adjustment)

          await tx.cTraderAccountMetric.update({
            where: { accountId: payout.accountId },
            data: {
              balance: adjustedBalance,
              equity: adjustedEquity,
              lastBalance: adjustedBalance,
              lastEquity: adjustedEquity,
              highestBalance: adjustedHighestBalance,
              dailyHighBalance: adjustedDailyHighBalance,
              breachBalance: clampNonNegative(metrics.breachBalance - adjustment),
              dailyBreachBalance: clampNonNegative(metrics.dailyBreachBalance - adjustment),
              maxPermittedLossLeft: clampNonNegative(metrics.maxPermittedLossLeft + adjustment),
              capturedAt: completedAt,
            },
          })
        }
      }

      return payoutUpdate
    })

    try {
      const payoutAccount = updated.accountId
        ? await prisma.cTraderAccount.findUnique({ where: { id: updated.accountId } })
        : null
      const payoutCurrency = resolveCurrencyLabel(payoutAccount?.currency)
      const certificate = await createPayoutCertificate({
        userId: updated.userId,
        payoutId: updated.id,
        accountId: updated.accountId,
        amount: updated.amountKobo / 100,
        currency: payoutCurrency,
      })

      const user = await prisma.user.findUnique({ where: { id: updated.userId } })
      if (user?.email) {
        const attachments = certificate.certificateUrl
          ? [
            await fetchRemoteAttachment({
              url: certificate.certificateUrl,
              filename: 'payout-certificate.png',
              contentType: 'image/png',
            }),
          ]
          : undefined

        await sendUnifiedEmail({
          to: user.email,
          subject: 'Your payout has been approved',
          title: 'Payout Processed 💸',
          subtitle: 'Your payout has been approved',
          content: 'Your payout request has been approved and is being processed. Thank you for trading with MACHEFUNDED!',
          buttonText: 'View Dashboard',
          infoBox: `Amount: ${formatMoney(updated.amountKobo / 100, payoutCurrency)}<br>Status: Approved<br>Reference: ${updated.providerRef ?? updated.id}`,
          ...(attachments ? { attachments } : {}),
        })
      }
    } catch (error) {
      console.error('Failed to create payout certificate', error)
    }

    res.json({
      id: updated.id,
      status: updated.status,
      message: 'Payout approved.',
    })
  } catch (err) {
    next(err as Error)
  }
}

export const rejectPayoutRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payoutId = Number(req.params.id)
    const { reason } = req.body as { reason?: string }
    if (!payoutId) {
      throw new ApiError('Payout ID is required', 400)
    }

    const payout = await prisma.payout.findUnique({ where: { id: payoutId } })
    if (!payout) {
      throw new ApiError('Payout not found', 404)
    }

    if (payout.status !== 'pending_approval') {
      throw new ApiError('Only pending payouts can be rejected', 400)
    }

    const updated = await prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: 'failed',
        rejectedAt: new Date(),
        rejectedBy: req.user?.email ?? 'admin',
        rejectionReason: reason ?? 'Rejected by admin',
      },
    })

    res.json({
      id: updated.id,
      status: updated.status,
      message: 'Payout rejected.',
    })
  } catch (err) {
    next(err as Error)
  }
}
