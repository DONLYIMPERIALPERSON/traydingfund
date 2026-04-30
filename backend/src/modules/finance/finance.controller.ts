import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { buildObjectiveFields, parseAccountSize } from '../ctrader/ctrader.objectives'
import { createOverallRewardCertificate, createPayoutCertificate } from '../../services/certificate.service'
import { fetchRemoteAttachment, sendUnifiedEmail } from '../../services/email.service'
import { sendEmailOnce } from '../../services/emailLog.service'
import { getFxRatesConfig } from '../fxRates/fxRates.service'
import { buildCacheKey, clearCacheByPrefix } from '../../common/cache'
import { env } from '../../config/env'

const ensureFinanceKey = (req: Request) => {
  const apiKey = req.header('x-finance-engine-key')
  if (!apiKey || apiKey !== env.financeEngineApiKey) {
    throw new ApiError('Unauthorized finance engine request', 401)
  }
}

const resetAccountMetrics = async (accountId: number, newBalance: number, phase: string, challengeType: string) => {
  const objectiveFields = await buildObjectiveFields({
    accountSize: String(newBalance),
    challengeType,
    phase,
  })
  const now = new Date()
  const maxDdAmount = objectiveFields.maxDdAmount ?? 0
  const dailyDdAmount = objectiveFields.dailyDdAmount ?? 0
  const breachBalance = newBalance - maxDdAmount
  const dailyBreachBalance = newBalance - dailyDdAmount
  await prisma.cTraderAccountMetric.upsert({
    where: { accountId },
    create: {
      accountId,
      balance: newBalance,
      equity: newBalance,
      unrealizedPnl: 0,
      maxPermittedLossLeft: newBalance,
      highestBalance: newBalance,
      breachBalance,
      profitTargetBalance: newBalance,
      winRate: 0,
      closedTradesCount: 0,
      winningTradesCount: 0,
      lotsTradedTotal: 0,
      todayClosedPnl: 0,
      todayTradesCount: 0,
      todayLotsTotal: 0,
      minTradingDaysRequired: objectiveFields.minTradingDaysRequired ?? 0,
      minTradingDaysMet: false,
      stageElapsedHours: 0,
      scalpingViolationsCount: 0,
      durationViolationsCount: 0,
      processedTradeIds: [],
      dailyStartAt: now,
      dailyHighBalance: newBalance,
      dailyBreachBalance,
      firstTradeAt: null,
      totalTrades: 0,
      shortDurationViolation: false,
      breachReason: null,
      minEquity: newBalance,
      lastBalance: newBalance,
      lastEquity: newBalance,
      expectedBalanceChange: false,
      expectedChangeExpiresAt: null,
      expectedBalanceOperationType: null,
      expectedBalanceOperationExpiresAt: null,
      expectedBalanceOperationAmount: null,
      capturedAt: now,
    },
    update: {
      balance: newBalance,
      equity: newBalance,
      unrealizedPnl: 0,
      maxPermittedLossLeft: newBalance,
      highestBalance: newBalance,
      breachBalance,
      profitTargetBalance: newBalance,
      minTradingDaysRequired: objectiveFields.minTradingDaysRequired ?? 0,
      minTradingDaysMet: false,
      stageElapsedHours: 0,
      durationViolationsCount: 0,
      processedTradeIds: [],
      dailyStartAt: now,
      dailyHighBalance: newBalance,
      dailyBreachBalance,
      firstTradeAt: null,
      totalTrades: 0,
      shortDurationViolation: false,
      breachReason: null,
      minEquity: newBalance,
      lastBalance: newBalance,
      lastEquity: newBalance,
      expectedBalanceChange: false,
      expectedChangeExpiresAt: null,
      expectedBalanceOperationType: null,
      expectedBalanceOperationExpiresAt: null,
      expectedBalanceOperationAmount: null,
      capturedAt: now,
    },
  })
}

const ATTIC_PROMOTION_ACCOUNT_SIZE = '₦200,000'

const resolveNextPhase = (challengeType: string, phase?: string | null) => {
  const normalizedChallengeType = String(challengeType ?? '').toLowerCase()
  const normalizedPhase = String(phase ?? '').toLowerCase()
  if (normalizedChallengeType === 'attic') {
    return 'phase_1'
  }
  if (normalizedChallengeType === 'instant_funded') {
    return 'funded'
  }
  if (normalizedPhase === 'phase_1') return 'phase_2'
  if (normalizedPhase === 'phase_2') return 'funded'
  return phase ?? 'phase_1'
}

const resolveNextChallengeType = (challengeType: string) => {
  const normalizedChallengeType = String(challengeType ?? '').toLowerCase()
  if (normalizedChallengeType === 'attic') {
    return 'ngn_standard'
  }
  return challengeType
}

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

export const resetComplete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureFinanceKey(req)
    const { account_number } = req.body as { account_number?: string }
    if (!account_number) {
      throw new ApiError('account_number is required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: { accountNumber: account_number },
      include: { metrics: true },
    })
    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    const promotedChallengeType = resolveNextChallengeType(account.challengeType ?? 'two_step')
    const promotedAccountSize = String(account.challengeType ?? '').toLowerCase() === 'attic'
      ? ATTIC_PROMOTION_ACCOUNT_SIZE
      : account.accountSize
    const newBalance = parseAccountSize(promotedAccountSize)
      ?? account.metrics?.balance
      ?? account.initialBalance
      ?? parseAccountSize(account.accountSize)
      ?? 0
    const challengeType = account.challengeType ?? 'two_step'
    const nextPhase = resolveNextPhase(challengeType, account.phase)

    const storedInitial = newBalance
    const expectedOperationExpiresAt = new Date(Date.now() + 5 * 60 * 1000)
    await prisma.$transaction([
      prisma.cTraderAccount.update({
        where: { id: account.id },
        data: {
          status: 'active',
          phase: nextPhase,
          challengeType: promotedChallengeType,
          accountSize: promotedAccountSize,
          currency: String(promotedChallengeType).toLowerCase().includes('ngn') ? 'NGN' : account.currency,
          breachedAt: null,
          passedAt: null,
          initialBalance: storedInitial,
        },
      }),
      prisma.cTraderAccountMetric.updateMany({
        where: { accountId: account.id },
        data: {
          expectedBalanceChange: true,
          expectedChangeExpiresAt: expectedOperationExpiresAt,
          expectedBalanceOperationType: 'PHASE_RESET',
          expectedBalanceOperationExpiresAt: expectedOperationExpiresAt,
          expectedBalanceOperationAmount: newBalance,
        },
      }),
      prisma.accountAdjustment.create({
        data: {
          accountId: account.id,
          type: 'reset',
          amount: newBalance,
          reason: 'phase_reset',
        },
      }),
    ])

    await resetAccountMetrics(account.id, newBalance, nextPhase, promotedChallengeType)

    if (account.userId) {
      await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', account.userId]))
      await clearCacheByPrefix(buildCacheKey(['payouts', 'summary', account.userId]))
    }

    if (account.userId) {
      const user = await prisma.user.findUnique({ where: { id: account.userId } })
      if (user?.email) {
        try {
          await sendEmailOnce({
            type: 'RESET_COMPLETED',
            accountId: account.id,
            userId: account.userId,
            send: async () => {
              await sendUnifiedEmail({
                to: user.email,
                subject: '🚀 Your Account is Ready for the Next Phase',
                title: 'Account Reset Completed',
                subtitle: 'Your next phase is now active',
                content: 'Your account reset is complete. Your phase has been upgraded, your balance has been reset, and your account is active again. You can continue trading with the same login credentials.',
                buttonText: 'View Dashboard',
                infoBox: `Account Number: ${account.accountNumber}<br>New Challenge: ${promotedChallengeType}<br>New Phase: ${nextPhase}<br>Balance Reset: ${newBalance}`,
              })
            },
          })
        } catch (error) {
          console.error('Failed to send reset completion email', error)
        }
      }
    }

    res.json({ status: 'ok', message: 'Account reset completed' })
  } catch (err) {
    next(err as Error)
  }
}

export const withdrawComplete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureFinanceKey(req)
    const { account_number } = req.body as { account_number?: string }
    if (!account_number) {
      throw new ApiError('account_number is required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: { accountNumber: account_number },
      include: { metrics: true },
    })
    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    const newBalance = account.metrics?.balance
      ?? account.initialBalance
      ?? parseAccountSize(account.accountSize)
      ?? 0
    const challengeType = account.challengeType ?? 'two_step'
    const phase = account.phase ?? 'funded'

    const storedInitial = newBalance
    const completedAt = new Date()
    await prisma.$transaction([
      prisma.cTraderAccount.update({
        where: { id: account.id },
        data: {
          status: 'active',
          initialBalance: storedInitial,
        },
      }),
      prisma.payout.updateMany({
        where: { accountId: account.id, status: { in: ['processing', 'pending_approval'] } },
        data: {
          status: 'completed',
          completedAt,
        },
      }),
    ])

    await resetAccountMetrics(account.id, newBalance, phase, challengeType)

    if (account.userId) {
      await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', account.userId]))
      await clearCacheByPrefix(buildCacheKey(['payouts', 'summary', account.userId]))
    }

    const completedPayout = await prisma.payout.findFirst({
      where: { accountId: account.id, status: 'completed' },
      orderBy: { completedAt: 'desc' },
      include: { account: true },
    })

    if (completedPayout) {
      try {
        const payoutCurrency = resolveCurrencyLabel(completedPayout.account?.currency)
        const certificate = await createPayoutCertificate({
          userId: completedPayout.userId,
          payoutId: completedPayout.id,
          accountId: completedPayout.accountId,
          amount: completedPayout.amountKobo / 100,
          currency: payoutCurrency,
        })

        const allPayouts = await prisma.payout.findMany({
          where: { userId: completedPayout.userId, status: { in: ['processing', 'completed', 'pending_approval'] } },
          select: { profitAmount: true, amountKobo: true, account: { select: { currency: true } } },
        })
        const fxConfig = await getFxRatesConfig()
        const usdNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
        const userPreference = await prisma.user.findUnique({
          where: { id: completedPayout.userId },
          select: { overallRewardCurrency: true },
        })
        const preferredCurrency = (userPreference?.overallRewardCurrency ?? 'USD').toUpperCase()
        const totalReward = allPayouts.reduce((sum, payoutItem) => {
          const rawAmount = payoutItem.profitAmount ?? (payoutItem.amountKobo ? payoutItem.amountKobo / 100 : 0)
          const payoutCurrency = payoutItem.account?.currency ?? 'USD'
          if (preferredCurrency === 'NGN') {
            const ngnAmount = payoutCurrency.toUpperCase() === 'NGN' ? rawAmount : rawAmount * usdNgnRate
            return sum + ngnAmount
          }
          return sum + (payoutCurrency.toUpperCase() === 'NGN'
            ? rawAmount / usdNgnRate
            : rawAmount)
        }, 0)
        const overallCurrency = preferredCurrency === 'NGN' ? 'NGN' : 'USD'
        await createOverallRewardCertificate({
          userId: completedPayout.userId,
          totalReward,
          currency: overallCurrency,
        })

        const user = await prisma.user.findUnique({ where: { id: completedPayout.userId } })
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

          await sendEmailOnce({
            type: 'WITHDRAW_COMPLETED',
            accountId: completedPayout.accountId ?? null,
            userId: completedPayout.userId,
            send: async () => {
              await sendUnifiedEmail({
                to: user.email,
                subject: '💸 Withdrawal Completed Successfully',
                title: 'Withdrawal Completed',
                subtitle: 'Your payout has been sent',
                content: 'Your withdrawal has been completed successfully. Your account has been reset and is active again. You can continue trading immediately.',
                buttonText: 'View Dashboard',
                infoBox: `Amount: ${formatMoney(completedPayout.amountKobo / 100, payoutCurrency)}<br>Account Size: ${completedPayout.account?.accountSize ?? 'N/A'}<br>Status: Completed<br>Account: ${completedPayout.account?.accountNumber ?? 'N/A'}`,
                ...(attachments ? { attachments } : {}),
              })
            },
          })
        }
      } catch (error) {
        console.error('Failed to finalize payout completion', error)
      }
    }

    res.json({ status: 'ok', message: 'Withdrawal reset completed' })
  } catch (err) {
    next(err as Error)
  }
}

export const withdrawApproved = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureFinanceKey(req)
    const { account_number, amount } = req.body as { account_number?: string; amount?: number }
    if (!account_number) {
      throw new ApiError('account_number is required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: { accountNumber: account_number },
    })
    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    await prisma.$transaction([
      prisma.cTraderAccount.update({
        where: { id: account.id },
        data: { status: 'withdraw_requested' },
      }),
      prisma.payout.updateMany({
        where: { accountId: account.id, status: 'pending_approval' },
        data: {
          status: 'processing',
          approvedAt: new Date(),
        },
      }),
      prisma.accountAdjustment.create({
        data: {
          accountId: account.id,
          type: 'withdraw_approved',
          amount: amount ?? 0,
          reason: 'withdrawal_approved',
        },
      }),
    ])

    if (account.userId) {
      await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', account.userId]))
      await clearCacheByPrefix(buildCacheKey(['payouts', 'summary', account.userId]))
    }

    res.json({ status: 'ok', message: 'Withdrawal approval recorded' })
  } catch (err) {
    next(err as Error)
  }
}

export const adjustBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureFinanceKey(req)
    const { account_number, amount, reason } = req.body as {
      account_number?: string
      amount?: number
      reason?: string
    }
    if (!account_number || amount == null) {
      throw new ApiError('account_number and amount are required', 400)
    }
    if (!Number.isFinite(amount)) {
      throw new ApiError('amount must be a number', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: { accountNumber: account_number },
      include: { metrics: true },
    })
    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    const now = new Date()
    const expectedOperationExpiresAt = new Date(now.getTime() + 5 * 60 * 1000)
    await prisma.$transaction([
      prisma.accountAdjustment.create({
        data: {
          accountId: account.id,
          type: 'manual_adjustment',
          amount,
          reason: reason ?? 'manual_adjustment',
        },
      }),
      prisma.cTraderAccountMetric.upsert({
        where: { accountId: account.id },
        create: {
          accountId: account.id,
          balance: amount,
          equity: amount,
          unrealizedPnl: 0,
          maxPermittedLossLeft: amount,
          highestBalance: amount,
          breachBalance: amount,
          profitTargetBalance: amount,
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
          durationViolationsCount: 0,
          processedTradeIds: [],
          dailyStartAt: now,
          dailyHighBalance: amount,
          dailyBreachBalance: amount,
          firstTradeAt: null,
          totalTrades: 0,
          shortDurationViolation: false,
          breachReason: null,
          lastBalance: amount,
          lastEquity: amount,
          expectedBalanceChange: true,
          expectedChangeExpiresAt: expectedOperationExpiresAt,
          expectedBalanceOperationType: 'MANUAL_ADJUSTMENT',
          expectedBalanceOperationExpiresAt: expectedOperationExpiresAt,
          expectedBalanceOperationAmount: amount,
          capturedAt: now,
        },
        update: {
          balance: amount,
          equity: amount,
          highestBalance: amount,
          breachBalance: amount,
          profitTargetBalance: amount,
          lastBalance: amount,
          lastEquity: amount,
          expectedBalanceChange: true,
          expectedChangeExpiresAt: expectedOperationExpiresAt,
          expectedBalanceOperationType: 'MANUAL_ADJUSTMENT',
          expectedBalanceOperationExpiresAt: expectedOperationExpiresAt,
          expectedBalanceOperationAmount: amount,
          capturedAt: now,
        },
      }),
    ])

    if (account.userId) {
      await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', account.userId]))
      await clearCacheByPrefix(buildCacheKey(['payouts', 'summary', account.userId]))
    }

    res.json({ status: 'ok', message: 'Balance adjustment recorded' })
  } catch (err) {
    next(err as Error)
  }
}