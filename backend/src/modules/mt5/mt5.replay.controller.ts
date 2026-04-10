import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { ApiError } from '../../common/errors'
import { sendUnifiedEmail } from '../../services/email.service'
import { sendEmailOnce } from '../../services/emailLog.service'

type ReplayResultPayload = {
  account_number?: string
  breach_reason?: string | null
  breach_balance?: number
  daily_breach_balance?: number | null
  min_equity?: number
  daily_low_equity?: number | null
  drawdown_percent?: number | null
  daily_dd_percent?: number | null
  trading_cycle_start?: string | null
  trading_cycle_source?: string | null
  profit?: number
  balance?: number | null
  equity?: number | null
  trading_days_count?: number | null
  breach_event?: Record<string, unknown> | null
  trade_duration_violations?: Record<string, unknown>[]
  passed?: boolean
  profit_target_balance?: number | null
  payload_received_at?: string
}

const ensureEngineAuth = (req: Request) => {
  const secret = String(req.header('X-ENGINE-SECRET') ?? '')
  const allowedSecrets = [env.mt5EngineSecret, env.ctraderEngineSecret].filter(Boolean)
  if (!secret || !allowedSecrets.includes(secret)) {
    throw new ApiError('Unauthorized engine request', 401)
  }
}

export const ingestMt5ReplayResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureEngineAuth(req)

    const payload = req.body as ReplayResultPayload
    if (!payload.account_number) {
      throw new ApiError('account_number is required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: { accountNumber: payload.account_number },
      include: { metrics: true, user: true },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    if (String(account.platform ?? 'ctrader').toLowerCase() !== 'mt5') {
      throw new ApiError('Replay result platform mismatch', 409)
    }

    const now = new Date()
    const metricsPayload = {
      accountId: account.id,
      minEquity: payload.min_equity ?? account.metrics?.minEquity ?? account.initialBalance ?? 0,
      dailyLowEquity: payload.daily_low_equity ?? account.metrics?.dailyLowEquity ?? null,
      drawdownPercent: payload.drawdown_percent ?? account.metrics?.drawdownPercent ?? null,
      dailyDrawdownPercent: payload.daily_dd_percent ?? account.metrics?.dailyDrawdownPercent ?? null,
      breachBalance: payload.breach_balance ?? account.metrics?.breachBalance ?? 0,
      dailyBreachBalance: payload.daily_breach_balance ?? account.metrics?.dailyBreachBalance ?? 0,
      profitTargetBalance: payload.profit_target_balance ?? account.metrics?.profitTargetBalance ?? 0,
      tradingCycleStart: payload.trading_cycle_start ? new Date(payload.trading_cycle_start) : account.metrics?.tradingCycleStart ?? null,
      tradingCycleSource: payload.trading_cycle_source ?? account.metrics?.tradingCycleSource ?? null,
      lastBalance: payload.balance ?? account.metrics?.lastBalance ?? account.initialBalance ?? 0,
      lastEquity: payload.equity ?? account.metrics?.lastEquity ?? account.initialBalance ?? 0,
      breachReason: payload.breach_reason ?? account.metrics?.breachReason ?? null,
      capturedAt: now,
      tradingDaysCount: payload.trading_days_count ?? account.metrics?.tradingDaysCount ?? null,
      breachEvent: payload.breach_event ?? (account.metrics as { breachEvent?: unknown } | null)?.breachEvent ?? null,
      tradeDurationViolations: payload.trade_duration_violations
        ?? (account.metrics as { tradeDurationViolations?: unknown } | null)?.tradeDurationViolations
        ?? null,
    }

    const durationViolationsCount = Array.isArray(metricsPayload.tradeDurationViolations)
      ? metricsPayload.tradeDurationViolations.length
      : account.metrics?.durationViolationsCount ?? 0
    const shortDurationViolation = durationViolationsCount >= 3

    await prisma.cTraderAccountMetric.upsert({
      where: { accountId: account.id },
      create: {
        balance: metricsPayload.lastBalance,
        equity: metricsPayload.lastEquity,
        unrealizedPnl: account.metrics?.unrealizedPnl ?? 0,
        maxPermittedLossLeft: account.metrics?.maxPermittedLossLeft ?? 0,
        highestBalance: account.metrics?.highestBalance ?? account.initialBalance ?? 0,
        profitTargetBalance: metricsPayload.profitTargetBalance,
        breachBalance: metricsPayload.breachBalance,
        winRate: account.metrics?.winRate ?? 0,
        closedTradesCount: account.metrics?.closedTradesCount ?? 0,
        winningTradesCount: account.metrics?.winningTradesCount ?? 0,
        lotsTradedTotal: account.metrics?.lotsTradedTotal ?? 0,
        todayClosedPnl: account.metrics?.todayClosedPnl ?? 0,
        todayTradesCount: account.metrics?.todayTradesCount ?? 0,
        todayLotsTotal: account.metrics?.todayLotsTotal ?? 0,
        minTradingDaysRequired: account.metrics?.minTradingDaysRequired ?? 0,
        minTradingDaysMet: account.metrics?.minTradingDaysMet ?? false,
        stageElapsedHours: account.metrics?.stageElapsedHours ?? 0,
        scalpingViolationsCount: account.metrics?.scalpingViolationsCount ?? 0,
        durationViolationsCount,
        processedTradeIds: account.metrics?.processedTradeIds ?? [],
        dailyStartAt: account.metrics?.dailyStartAt ?? null,
        dailyHighBalance: account.metrics?.dailyHighBalance ?? 0,
        dailyBreachBalance: metricsPayload.dailyBreachBalance,
        dailyLowEquity: metricsPayload.dailyLowEquity,
        drawdownPercent: metricsPayload.drawdownPercent,
        dailyDrawdownPercent: metricsPayload.dailyDrawdownPercent,
        firstTradeAt: account.metrics?.firstTradeAt ?? null,
        totalTrades: account.metrics?.totalTrades ?? 0,
        tradingDaysCount: metricsPayload.tradingDaysCount,
        tradingCycleStart: metricsPayload.tradingCycleStart,
        tradingCycleSource: metricsPayload.tradingCycleSource,
        shortDurationViolation,
        breachReason: metricsPayload.breachReason,
        minEquity: metricsPayload.minEquity,
        minEquityNote: account.metrics?.minEquityNote ?? null,
        engineId: account.metrics?.engineId ?? null,
        latencyMs: account.metrics?.latencyMs ?? null,
        lastBalance: metricsPayload.lastBalance,
        lastEquity: metricsPayload.lastEquity,
        expectedBalanceChange: account.metrics?.expectedBalanceChange ?? false,
        expectedChangeExpiresAt: account.metrics?.expectedChangeExpiresAt ?? null,
        expectedBalanceOperationType: account.metrics?.expectedBalanceOperationType ?? null,
        expectedBalanceOperationExpiresAt: account.metrics?.expectedBalanceOperationExpiresAt ?? null,
        expectedBalanceOperationAmount: account.metrics?.expectedBalanceOperationAmount ?? null,
        breachEvent: (metricsPayload as { breachEvent?: unknown }).breachEvent ?? Prisma.JsonNull,
        tradeDurationViolations: (metricsPayload as { tradeDurationViolations?: unknown }).tradeDurationViolations ?? Prisma.JsonNull,
        capturedAt: metricsPayload.capturedAt,
        accountId: account.id,
      },
      update: {
        minEquity: metricsPayload.minEquity,
        dailyLowEquity: metricsPayload.dailyLowEquity,
        drawdownPercent: metricsPayload.drawdownPercent,
        dailyDrawdownPercent: metricsPayload.dailyDrawdownPercent,
        breachBalance: metricsPayload.breachBalance,
        dailyBreachBalance: metricsPayload.dailyBreachBalance,
        profitTargetBalance: metricsPayload.profitTargetBalance,
        tradingCycleStart: metricsPayload.tradingCycleStart,
        tradingCycleSource: metricsPayload.tradingCycleSource,
        breachReason: metricsPayload.breachReason,
        balance: metricsPayload.lastBalance,
        equity: metricsPayload.lastEquity,
        tradingDaysCount: metricsPayload.tradingDaysCount,
        breachEvent: (metricsPayload as { breachEvent?: unknown }).breachEvent ?? Prisma.JsonNull,
        tradeDurationViolations: (metricsPayload as { tradeDurationViolations?: unknown }).tradeDurationViolations ?? Prisma.JsonNull,
        durationViolationsCount,
        shortDurationViolation,
        capturedAt: metricsPayload.capturedAt,
      },
    })

    const wasBreached = account.status?.toLowerCase() === 'breached'

    if (payload.breach_reason) {
      await prisma.cTraderAccount.update({
        where: { id: account.id },
        data: { status: 'breached', breachedAt: now },
      })

      if (!wasBreached && account.user?.email) {
        try {
          await sendEmailOnce({
            type: 'ACCOUNT_BREACHED',
            accountId: account.id,
            userId: account.userId ?? null,
            send: async () => {
              await sendUnifiedEmail({
                to: account.user!.email,
                subject: '⚠️ Account Breached',
                title: 'Account Breached',
                subtitle: 'We detected a rule violation on your account',
                content: 'Your account has been marked as breached due to a rule violation. Please review the reason below and contact support if you need help.',
                buttonText: 'Go to Dashboard',
                infoBox: `Account Number: ${account.accountNumber}<br>Reason: ${payload.breach_reason ?? 'Rule violation'}<br>Balance: ${metricsPayload.lastBalance}<br>${payload.breach_reason === 'DAILY_DRAWDOWN' ? `Min Equity: ${metricsPayload.minEquity}` : `Equity: ${metricsPayload.lastEquity}`}`,
              })
            },
          })
        } catch (error) {
          console.error('Failed to send replay breach email', error)
        }
      }
    } else if (payload.passed) {
      await prisma.cTraderAccount.update({
        where: { id: account.id },
        data: { status: 'awaiting_reset', passedAt: now },
      })
    }

    res.json({ status: 'ok' })
  } catch (error) {
    next(error as Error)
  }
}