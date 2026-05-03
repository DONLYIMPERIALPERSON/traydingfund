import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { ApiError } from '../../common/errors'
import { clearCacheByPrefix } from '../../common/cache'

type BreezyMetricsPayload = {
  account_number?: string
  platform?: string
  balance?: number
  equity?: number
  unrealized_pnl?: number
  account_status?: string
  breach_reason?: string | null
  capital_protection_level?: number
  min_equity?: number
  peak_balance?: number
  trading_cycle_start?: string | null
  trading_cycle_source?: string | null
  realized_profit?: number
  profit_percent?: number
  closed_trades?: number
  risk_score?: number
  risk_score_band?: string
  components?: Record<string, unknown>
  trade_metrics?: Array<Record<string, unknown>>
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

const parseIsoDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

const buildNormalizedRiskComponents = (
  payload: BreezyMetricsPayload,
): Prisma.InputJsonValue => {
  const baseComponents = payload.components && typeof payload.components === 'object'
    ? { ...payload.components }
    : {}

  const existingTransparency = (
    'transparency' in baseComponents
    && baseComponents.transparency
    && typeof baseComponents.transparency === 'object'
  )
    ? baseComponents.transparency as Record<string, unknown>
    : null

  const normalizedTransparency = existingTransparency ?? {
    score_breakdown: {
      trades_contribution: typeof baseComponents.trade_component_weighted === 'number' ? baseComponents.trade_component_weighted : 0,
      behavior_contribution: typeof baseComponents.behavior_component_weighted === 'number' ? baseComponents.behavior_component_weighted : 0,
      healthy_day_bonus: typeof baseComponents.healthy_day_bonus === 'number' ? baseComponents.healthy_day_bonus : 0,
      final_breezy_score: payload.risk_score ?? 0,
    },
    healthy_days: Array.isArray(baseComponents.healthy_days) ? baseComponents.healthy_days : [],
    trade_cards: Array.isArray(payload.trade_metrics)
      ? payload.trade_metrics
      : Array.isArray((baseComponents as { trade_cards?: unknown }).trade_cards)
        ? (baseComponents as { trade_cards?: unknown[] }).trade_cards
        : [],
  }

  return {
    ...baseComponents,
    transparency: normalizedTransparency,
  } as Prisma.InputJsonValue
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
    const normalizedRiskComponents = buildNormalizedRiskComponents(payload)

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
          unrealizedPnl: Number(payload.unrealized_pnl ?? (Number(payload.equity) - Number(payload.balance))),
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
          tradingCycleStart: parseIsoDate(payload.trading_cycle_start),
          tradingCycleSource: payload.trading_cycle_source ? String(payload.trading_cycle_source) : 'breezy_engine',
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
          riskComponents: normalizedRiskComponents,
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
          unrealizedPnl: Number(payload.unrealized_pnl ?? (Number(payload.equity) - Number(payload.balance))),
          highestBalance: Number(payload.peak_balance ?? payload.balance),
          breachBalance: Number(payload.capital_protection_level ?? 0),
          closedTradesCount: Number(payload.closed_trades ?? 0),
          totalTrades: Number(payload.closed_trades ?? 0),
          tradingDaysCount: dailyPnlSummary.length,
          tradingCycleStart: parseIsoDate(payload.trading_cycle_start),
          tradingCycleSource: payload.trading_cycle_source ? String(payload.trading_cycle_source) : 'breezy_engine',
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
          riskComponents: normalizedRiskComponents,
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
        try {
          for (const entry of dailyPnlSummary) {
            await tx.accountDailyPnl.upsert({
              where: { accountId_date: { accountId: account.id, date: entry.date } },
              create: { accountId: account.id, date: entry.date, pnl: entry.pnl },
              update: { pnl: entry.pnl },
            })
          }
        } catch (dailyPnlError) {
          if (dailyPnlError instanceof Prisma.PrismaClientKnownRequestError && dailyPnlError.code === 'P2021') {
            console.warn('[BREEZY_METRICS] AccountDailyPnl table missing, skipping daily pnl persistence for now')
          } else {
            throw dailyPnlError
          }
        }
      }
    })

    if (account.userId) {
      await clearCacheByPrefix(`mf-cache:trader:challenges:${account.userId}`)
      await clearCacheByPrefix(`mf-cache:trader:me:${account.userId}`)
    }

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