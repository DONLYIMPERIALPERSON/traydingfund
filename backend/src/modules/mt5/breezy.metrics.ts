import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { ApiError } from '../../common/errors'

type BreezyMetricsPayload = {
  account_number?: string
  platform?: string
  balance?: number
  equity?: number
  account_status?: string
  breach_reason?: string | null
  capital_protection_level?: number
  min_equity?: number
  peak_balance?: number
  realized_profit?: number
  profit_percent?: number
  closed_trades?: number
  risk_score?: number
  risk_score_band?: string
  components?: Record<string, unknown>
  profit_split?: number
  withdrawal_eligible?: boolean
  withdrawal_block_reason?: string | null
  breach_event?: unknown
  daily_pnl_summary?: Array<{ date?: string; pnl?: number }>
  snapshot?: Record<string, unknown> | null
  max_total_exposure?: number
  max_single_position_risk?: number
}

const parseDailyPnlSummary = (value: unknown): Array<{ date: Date; pnl: number }> => {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const rawDate = (entry as { date?: unknown }).date
    const rawPnl = (entry as { pnl?: unknown }).pnl
    if (typeof rawDate !== 'string' || !Number.isFinite(rawPnl)) return []
    const parsedDate = new Date(`${rawDate}T00:00:00.000Z`)
    if (!Number.isFinite(parsedDate.getTime())) return []
    return [{ date: parsedDate, pnl: Number(rawPnl) }]
  })
}

export const upsertBreezyMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = req.header('X-ENGINE-SECRET')
    if (!secret || !env.mt5EngineSecret || secret !== env.mt5EngineSecret) {
      throw new ApiError('Unauthorized engine request', 401)
    }

    const payload = req.body as BreezyMetricsPayload
    if (!payload.account_number || payload.balance == null || payload.equity == null) {
      throw new ApiError('account_number, balance, and equity are required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: { accountNumber: payload.account_number },
      include: { metrics: true },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    if (String(account.challengeType ?? '').toLowerCase() !== 'breezy') {
      throw new ApiError('Breezy metrics can only be applied to breezy accounts', 409)
    }

    const accountStatus = String(payload.account_status ?? 'active').toLowerCase() === 'terminated'
      ? 'terminated'
      : 'active'
    const mappedAccountStatus = accountStatus === 'terminated' ? 'breached' : 'active'
    const now = new Date()
    const dailyPnlSummary = parseDailyPnlSummary(payload.daily_pnl_summary)

    await prisma.$transaction(async (tx) => {
      await tx.cTraderAccount.update({
        where: { id: account.id },
        data: {
          status: mappedAccountStatus,
          breachedAt: accountStatus === 'terminated' ? now : null,
        },
      })

      await tx.cTraderAccountMetric.upsert({
        where: { accountId: account.id },
        create: {
          accountId: account.id,
          balance: Number(payload.balance),
          equity: Number(payload.equity),
          unrealizedPnl: 0,
          maxPermittedLossLeft: 0,
          highestBalance: Number(payload.peak_balance ?? payload.balance),
          breachBalance: Number(payload.capital_protection_level ?? 0),
          profitTargetBalance: 0,
          winRate: 0,
          closedTradesCount: Number(payload.closed_trades ?? 0),
          winningTradesCount: 0,
          lotsTradedTotal: 0,
          todayClosedPnl: 0,
          todayTradesCount: 0,
          todayLotsTotal: 0,
          minTradingDaysRequired: 0,
          minTradingDaysMet: true,
          stageElapsedHours: 0,
          scalpingViolationsCount: 0,
          durationViolationsCount: 0,
          processedTradeIds: [],
          dailyStartAt: now,
          dailyHighBalance: Number(payload.balance),
          dailyBreachBalance: 0,
          dailyLowEquity: Number(payload.min_equity ?? payload.equity),
          drawdownPercent: null,
          dailyDrawdownPercent: null,
          firstTradeAt: null,
          totalTrades: Number(payload.closed_trades ?? 0),
          tradingDaysCount: dailyPnlSummary.length,
          tradingCycleStart: null,
          tradingCycleSource: 'breezy_engine',
          shortDurationViolation: false,
          breachReason: payload.breach_reason ? String(payload.breach_reason) : null,
          minEquity: Number(payload.min_equity ?? payload.equity),
          engineId: 'breezy_replay',
          latencyMs: null,
          lastBalance: Number(payload.balance),
          lastEquity: Number(payload.equity),
          breachEvent: (payload.breach_event ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          tradeDurationViolations: Prisma.JsonNull,
          capitalProtectionLevel: Number(payload.capital_protection_level ?? 0),
          accountStatus,
          riskScore: Number(payload.risk_score ?? 0),
          riskScoreBand: payload.risk_score_band ? String(payload.risk_score_band) : null,
          riskComponents: ((payload.components ?? Prisma.JsonNull) as Prisma.InputJsonValue),
          effectiveProfitSplitPercent: Number(payload.profit_split ?? 0),
          withdrawalEligible: Boolean(payload.withdrawal_eligible),
          withdrawalBlockReason: payload.withdrawal_block_reason ? String(payload.withdrawal_block_reason) : null,
          maxTotalExposure: Number(payload.max_total_exposure ?? 0),
          maxSinglePositionRisk: Number(payload.max_single_position_risk ?? 0),
          realizedProfit: Number(payload.realized_profit ?? 0),
          profitPercent: Number(payload.profit_percent ?? 0),
          capturedAt: now,
        },
        update: {
          balance: Number(payload.balance),
          equity: Number(payload.equity),
          highestBalance: Number(payload.peak_balance ?? payload.balance),
          breachBalance: Number(payload.capital_protection_level ?? 0),
          closedTradesCount: Number(payload.closed_trades ?? 0),
          totalTrades: Number(payload.closed_trades ?? 0),
          tradingDaysCount: dailyPnlSummary.length,
          dailyLowEquity: Number(payload.min_equity ?? payload.equity),
          breachReason: payload.breach_reason ? String(payload.breach_reason) : null,
          minEquity: Number(payload.min_equity ?? payload.equity),
          engineId: 'breezy_replay',
          lastBalance: Number(payload.balance),
          lastEquity: Number(payload.equity),
          breachEvent: (payload.breach_event ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          capitalProtectionLevel: Number(payload.capital_protection_level ?? 0),
          accountStatus,
          riskScore: Number(payload.risk_score ?? 0),
          riskScoreBand: payload.risk_score_band ? String(payload.risk_score_band) : null,
          riskComponents: ((payload.components ?? Prisma.JsonNull) as Prisma.InputJsonValue),
          effectiveProfitSplitPercent: Number(payload.profit_split ?? 0),
          withdrawalEligible: Boolean(payload.withdrawal_eligible),
          withdrawalBlockReason: payload.withdrawal_block_reason ? String(payload.withdrawal_block_reason) : null,
          maxTotalExposure: Number(payload.max_total_exposure ?? 0),
          maxSinglePositionRisk: Number(payload.max_single_position_risk ?? 0),
          realizedProfit: Number(payload.realized_profit ?? 0),
          profitPercent: Number(payload.profit_percent ?? 0),
          capturedAt: now,
        },
      })

      if (dailyPnlSummary.length > 0) {
        for (const entry of dailyPnlSummary) {
          await tx.accountDailyPnl.upsert({
            where: { accountId_date: { accountId: account.id, date: entry.date } },
            create: { accountId: account.id, date: entry.date, pnl: entry.pnl },
            update: { pnl: entry.pnl },
          })
        }
      }
    })

    res.json({
      message: 'Breezy metrics ingested successfully',
      account_number: account.accountNumber,
      challenge_type: account.challengeType,
      account_status: accountStatus,
    })
  } catch (err) {
    next(err as Error)
  }
}