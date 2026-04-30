import { Request, Response, NextFunction } from 'express'
import fs from 'fs'
import path from 'path'
import { prisma } from '../../config/prisma'
import { Prisma } from '@prisma/client'
import { env } from '../../config/env'
import { ApiError } from '../../common/errors'
import { buildObjectiveFields, getObjectiveRules } from './ctrader.objectives'
import { pushActiveAccountRemove } from '../../services/ctraderEngine.service'
import { notifyFinanceEngine } from '../../services/financeEngine.service'
import { createPassedChallengeCertificate } from '../../services/certificate.service'
import { fetchRemoteAttachment, sendUnifiedEmail } from '../../services/email.service'
import { sendEmailOnce } from '../../services/emailLog.service'
import { buildCacheKey, clearCacheByPrefix } from '../../common/cache'
import supportedSymbolsConfig from '../../config/supportedSymbols.json'
import { requestAccountAccess } from '../../services/accessEngine.service'
import { assignReadyAccountFromPool, normalizeChallengeBase, resolveChallengeCurrency } from './ctrader.assignment'

type TradePayload = {
  ticket?: string
  position_id?: string
  symbol?: string
  open_time?: string
  close_time?: string
  profit?: number
  dealType?: string
}

type PositionPayload = {
  position_id?: string
  symbol_id?: string
  volume?: number
  entry_price?: number
  open_time?: string
  close_time?: string
  trade_side?: 'BUY' | 'SELL'
  is_open?: boolean
}

type MetricsPayload = {
  account_number?: string
  platform?: string
  balance?: number
  equity?: number
  unrealized_pnl?: number
  min_equity?: number
  min_equity_note?: string
  peak_balance?: number
  equity_low?: number
  drawdown_percent?: number
  total_trades?: number
  short_trades_count?: number
  trading_days_count?: number
  daily_peak_balance?: number
  daily_low_equity?: number
  daily_dd_percent?: number
  trading_cycle_start?: string
  trading_cycle_source?: string
  trades?: TradePayload[]
  positions?: PositionPayload[]
  timestamp?: string
  engine_id?: string
  latency_ms?: number
  breach_reason?: string
  breach_balance?: number
  daily_breach_balance?: number
  breach_event?: unknown
  trade_duration_violations?: unknown
  passed?: boolean
  profit_target_balance?: number
  daily_pnl_summary?: Array<{ date?: string; pnl?: number }>
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

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_TRADE_DURATION_SECONDS = 180
const MAX_DURATION_VIOLATIONS = 3

const toUtcDateKey = (value: Date) => value.toISOString().slice(0, 10)

const parseDate = (value?: string) => (value ? new Date(value) : null)

const normalizeSymbol = (symbol: string) => symbol
  .replace(/m$/i, '')
  .replace(/_x\d+$/i, '')
  .replace(/\..*$/, '')

const calculateTradeDurationMinutes = (trade: TradePayload) => {
  const opened = parseDate(trade.open_time)
  const closed = parseDate(trade.close_time)
  if (!opened || !closed || closed.getTime() === 0) return null
  const durationMs = closed.getTime() - opened.getTime()
  if (durationMs <= 0) return null
  return durationMs / (60 * 1000)
}

export const upsertCTraderMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('=== MT5 METRICS REQUEST ===')
    console.log('Headers:', req.headers)
    console.log('Body:', req.body)

    const payload = req.body as MetricsPayload
    const normalizedPayloadPlatform = payload?.platform ? String(payload.platform).toLowerCase() : null
    if (normalizedPayloadPlatform === 'mt5') {
      try {
        const logDir = path.join(process.cwd(), 'outputs', 'mt5-payloads')
        const logPath = path.join(logDir, 'mt5-metrics.jsonl')
        fs.mkdirSync(logDir, { recursive: true })
        const entry = {
          receivedAt: new Date().toISOString(),
          headers: req.headers,
          payload,
        }
        fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8')
      } catch (error) {
        console.warn('[metrics] Failed to log MT5 payload', error)
      }
    }
    if (normalizedPayloadPlatform === 'mt5' && payload?.engine_id === 'replay') {
      try {
        const logDir = path.join(process.cwd(), 'outputs', 'replay-metrics')
        const logPath = path.join(logDir, 'replay-metrics.jsonl')
        fs.mkdirSync(logDir, { recursive: true })
        const entry = {
          receivedAt: new Date().toISOString(),
          headers: req.headers,
          payload,
        }
        fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8')
      } catch (error) {
        console.warn('[metrics] Failed to log replay payload', error)
      }
    }

    const secret = req.header('X-ENGINE-SECRET')
    const allowedSecrets = [env.ctraderEngineSecret, env.mt5EngineSecret].filter(Boolean)
    if (!secret || !allowedSecrets.includes(secret)) {
      console.log('❌ AUTH FAILED')
      console.log('Expected:', allowedSecrets)
      console.log('Received:', secret)
      return res.status(401).json({
        message: 'Unauthorized engine request',
        expected: allowedSecrets,
        received: secret,
      })
    }

    if (!payload.account_number || payload.balance == null || payload.equity == null) {
      throw new ApiError('account_number, balance, and equity are required', 400)
    }

    if (!payload.platform) {
      throw new ApiError('platform is required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: { accountNumber: payload.account_number },
      include: { metrics: true, user: true },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    const normalizedAccountPlatform = String(account.platform ?? 'ctrader').toLowerCase()
    const isMt5Payload = normalizedPayloadPlatform === 'mt5'
    if (normalizedPayloadPlatform !== normalizedAccountPlatform) {
      throw new ApiError('Platform mismatch for account metrics', 409)
    }

    if (payload.timestamp) {
      const sentAt = new Date(payload.timestamp)
      if (Number.isFinite(sentAt.getTime())) {
        const latencyMs = Date.now() - sentAt.getTime()
        if (latencyMs >= 0) {
          console.info('[metrics] ingest latency', {
            accountNumber: payload.account_number,
            platform: normalizedPayloadPlatform,
            latencyMs: payload.latency_ms ?? latencyMs,
            engineId: payload.engine_id ?? null,
          })
        }
      }
    }

    const accountData = account as any
    const metricsData = (account as any).metrics
    const dailyPnlSummary = parseDailyPnlSummary(payload.daily_pnl_summary)

    if (!accountData.challengeType || !accountData.phase) {
      throw new ApiError('Account challenge type/phase is missing', 400)
    }

    if (!accountData.initialBalance || !accountData.maxDdAmount || !accountData.dailyDdAmount) {
      const objectiveFields = await buildObjectiveFields({
        accountSize: accountData.accountSize,
        challengeType: accountData.challengeType,
        phase: accountData.phase,
      })
      await prisma.cTraderAccount.update({
        where: { id: account.id },
        data: objectiveFields as any,
      })
      Object.assign(accountData, objectiveFields)
    }

    const now = new Date()
    const metrics = metricsData
    // Keep reset expectations until explicitly cleared by reset completion.

    const equity = payload.equity
    const balance = payload.balance

    if (isMt5Payload && (!Number.isFinite(balance) || !Number.isFinite(equity))) {
      throw new ApiError('Invalid MT5 replay snapshot: balance/equity must be numeric', 400)
    }

    const reportedUnrealizedPnl = Number.isFinite(payload.unrealized_pnl)
      ? Number(payload.unrealized_pnl)
      : null
    const reportedPeakBalance = Number.isFinite(payload.peak_balance)
      ? Number(payload.peak_balance)
      : null
    const reportedEquityLow = Number.isFinite(payload.equity_low)
      ? Number(payload.equity_low)
      : null
    const reportedDrawdownPercent = Number.isFinite(payload.drawdown_percent)
      ? Number(payload.drawdown_percent)
      : null
    const reportedTotalTrades = Number.isFinite(payload.total_trades)
      ? Number(payload.total_trades)
      : null
    const reportedShortTradesCount = Number.isFinite(payload.short_trades_count)
      ? Number(payload.short_trades_count)
      : null
    const reportedTradingDaysCount = Number.isFinite(payload.trading_days_count)
      ? Number(payload.trading_days_count)
      : null
    const reportedDailyPeakBalance = Number.isFinite(payload.daily_peak_balance)
      ? Number(payload.daily_peak_balance)
      : null
    const reportedDailyLowEquity = Number.isFinite(payload.daily_low_equity)
      ? Number(payload.daily_low_equity)
      : null
    const reportedDailyDrawdownPercent = Number.isFinite(payload.daily_dd_percent)
      ? Number(payload.daily_dd_percent)
      : null
    const reportedBreachReason = payload.breach_reason ? String(payload.breach_reason) : null
    const reportedBreachBalance = Number.isFinite(payload.breach_balance)
      ? Number(payload.breach_balance)
      : null
    const reportedDailyBreachBalance = Number.isFinite(payload.daily_breach_balance)
      ? Number(payload.daily_breach_balance)
      : null
    const reportedBreachEvent = payload.breach_event ?? null
    const reportedTradeViolations = payload.trade_duration_violations ?? null
    const reportedProfitTargetBalance = Number.isFinite(payload.profit_target_balance)
      ? Number(payload.profit_target_balance)
      : null
    const reportedPassed = typeof payload.passed === 'boolean' ? payload.passed : null
    const resolvedBreachEvent = reportedBreachEvent ?? (metrics as any)?.breachEvent ?? null
    const resolvedTradeViolations = reportedTradeViolations ?? (metrics as any)?.tradeDurationViolations ?? null
    const tradingCycleStart = payload.trading_cycle_start
      ? new Date(payload.trading_cycle_start)
      : null
    const tradingCycleSource = payload.trading_cycle_source
      ? String(payload.trading_cycle_source)
      : null
    const reportedMinEquity = Number.isFinite(payload.min_equity) ? Number(payload.min_equity) : null
    const reportedMinEquityNote = payload.min_equity_note ? String(payload.min_equity_note) : null
    const priorMinEquity = (metrics as any)?.minEquity ?? null
    const minEquityCandidate = reportedMinEquity != null && reportedMinEquity > 0
      ? reportedMinEquity
      : (isMt5Payload && reportedDailyLowEquity != null && reportedDailyLowEquity > 0
        ? reportedDailyLowEquity
        : null)
    const minEquity = minEquityCandidate != null
      ? (priorMinEquity != null ? Math.min(priorMinEquity, minEquityCandidate) : minEquityCandidate)
      : (priorMinEquity ?? equity)
    const effectiveMinEquity = minEquity >= balance ? balance : minEquity
    const guardedMinEquity = isMt5Payload && equity < balance && effectiveMinEquity >= balance
      ? equity
      : effectiveMinEquity
    const effectiveEquityLow = isMt5Payload && reportedEquityLow != null
      ? reportedEquityLow
      : guardedMinEquity

    const highestBalance = isMt5Payload && reportedPeakBalance != null
      ? reportedPeakBalance
      : Math.max(metrics?.highestBalance ?? accountData.initialBalance ?? balance, balance)
    const breachBalance = isMt5Payload && reportedBreachBalance != null
      ? reportedBreachBalance
      : accountData.maxDdAmount != null
      ? highestBalance - accountData.maxDdAmount
      : (metrics?.breachBalance ?? balance)

    const dailyDdEnabled = accountData.dailyDdAmount != null && accountData.dailyDdAmount > 0
    const dailyStartAt = dailyDdEnabled && (metrics as any)?.dailyStartAt
      ? new Date((metrics as any).dailyStartAt)
      : null
    const isNewDay = dailyDdEnabled
      && (!dailyStartAt || toUtcDateKey(dailyStartAt) !== toUtcDateKey(now))
    const dailyStartBalance = dailyDdEnabled
      ? (isMt5Payload
        ? (reportedDailyPeakBalance ?? balance)
        : (isNewDay
          ? balance
          : ((metrics as any)?.dailyHighBalance ?? balance)))
      : 0
    const dailyBreachBalance = dailyDdEnabled
      ? (isMt5Payload && reportedDailyBreachBalance != null
        ? reportedDailyBreachBalance
        : dailyStartBalance - accountData.dailyDdAmount)
      : 0

    const trades = payload.trades ?? []
    const positions = payload.positions ?? []
    const tradeEvents = trades.length
      ? trades
      : positions.map((position) => {
        const event: TradePayload = {}
        if (position.position_id) {
          event.position_id = position.position_id
        }
        if (position.open_time) {
          event.open_time = position.open_time
        }
        if (position.close_time) {
          event.close_time = position.close_time
        }
        return event
      })
    const normalizedTradeEvents = tradeEvents.map((trade) => {
      const normalizedSymbol = trade.symbol ?? (trade as { symbol?: string }).symbol
      const normalizedProfit = trade.profit ?? (trade as { amount?: number }).amount
      const normalizedDealType = trade.dealType ?? (trade as { deal_type?: string }).deal_type
      return {
        ...trade,
        ...(normalizedSymbol ? { symbol: normalizedSymbol } : {}),
        ...(typeof normalizedProfit === 'number' ? { profit: normalizedProfit } : {}),
        ...(normalizedDealType ? { dealType: String(normalizedDealType) } : {}),
      }
    })
    const ignoredDealTypes = new Set(['WITHDRAWAL', 'WITHDRAW', 'DEPOSIT', 'BALANCE'])
    const resetDeal = isMt5Payload
      ? normalizedTradeEvents.find((trade) => {
          const dealType = trade.dealType ? String(trade.dealType).toUpperCase() : ''
          const symbol = trade.symbol ? String(trade.symbol).toUpperCase() : ''
          return ignoredDealTypes.has(dealType) || symbol === 'BALANCE'
        })
      : null
    const closedTrades = normalizedTradeEvents.filter((trade) => trade.open_time && trade.close_time)
    const totalTrades = isMt5Payload && reportedTotalTrades != null
      ? reportedTotalTrades
      : ((metrics as any)?.totalTrades ?? 0) + closedTrades.length
    const priorProcessedTrades = Array.isArray((metrics as any)?.processedTradeIds)
      ? (metrics as any).processedTradeIds
      : []
    const processedTradeIds = new Set(priorProcessedTrades)
    const newlyProcessedTrades: TradePayload[] = []
    closedTrades.forEach((trade) => {
      const tradeId = trade.ticket ?? trade.position_id
      if (!tradeId) return
      if (processedTradeIds.has(tradeId)) return
      processedTradeIds.add(tradeId)
      newlyProcessedTrades.push(trade)
    })
    const priorViolations = (metrics as any)?.durationViolationsCount ?? 0
    const durationRuleEnabled = accountData.minTradeDurationMinutes != null
    const minDurationSeconds = durationRuleEnabled
      ? accountData.minTradeDurationMinutes * 60
      : MIN_TRADE_DURATION_SECONDS
    const newViolations = newlyProcessedTrades.filter((trade) => {
      const duration = calculateTradeDurationMinutes(trade)
      return durationRuleEnabled && duration != null && duration * 60 < minDurationSeconds
    }).length
    const durationViolationsCount = isMt5Payload
      ? (durationRuleEnabled ? Math.max(0, reportedShortTradesCount ?? 0) : 0)
      : (durationRuleEnabled ? priorViolations + newViolations : 0)
    const shortDurationViolation = durationRuleEnabled && durationViolationsCount >= MAX_DURATION_VIOLATIONS
    const supportedSymbols = new Set(
      (supportedSymbolsConfig.supported_symbols ?? []).map((symbol) => String(symbol).toUpperCase())
    )
    const unsupportedTrade = normalizedTradeEvents.find((trade) => {
      const rawSymbol = trade.symbol ? String(trade.symbol) : ''
      const normalizedSymbol = rawSymbol ? normalizeSymbol(rawSymbol).toUpperCase() : ''
      return normalizedSymbol && !supportedSymbols.has(normalizedSymbol)
    })
    const firstTradeAt = isMt5Payload
      ? (tradingCycleStart ?? (metrics as any)?.firstTradeAt ?? null)
      : ((metrics as any)?.firstTradeAt
        ?? tradeEvents.map((trade) => parseDate(trade.open_time)).find(Boolean)
        ?? accountData.startedAt
        ?? accountData.assignedAt
        ?? null)
    const stageElapsedHours = isMt5Payload
      ? (reportedTradingDaysCount != null ? reportedTradingDaysCount * 24 : (metrics?.stageElapsedHours ?? 0))
      : (firstTradeAt
        ? Math.max(0, (now.getTime() - new Date(firstTradeAt).getTime()) / (60 * 60 * 1000))
        : (metrics?.stageElapsedHours ?? 0))
    const minTradingDaysMet = isMt5Payload
      ? (accountData.minTradingDaysRequired != null
        && reportedTradingDaysCount != null
        && reportedTradingDaysCount >= accountData.minTradingDaysRequired)
      : (!!firstTradeAt
        && accountData.minTradingDaysRequired != null
        && now.getTime() >= firstTradeAt.getTime() + DAY_MS * accountData.minTradingDaysRequired)

    const derivedUnrealizedPnl = reportedUnrealizedPnl != null
      ? reportedUnrealizedPnl
      : equity - balance
    const derivedDrawdownPercent = isMt5Payload
      ? reportedDrawdownPercent
      : (highestBalance > 0 ? ((highestBalance - effectiveEquityLow) / highestBalance) * 100 : null)
    const derivedDailyDrawdownPercent = isMt5Payload
      ? reportedDailyDrawdownPercent
      : (dailyStartBalance > 0 ? ((dailyStartBalance - effectiveEquityLow) / dailyStartBalance) * 100 : null)

    const profitTargetBalance = accountData.profitTargetAmount != null && accountData.initialBalance != null
      ? accountData.initialBalance + accountData.profitTargetAmount
      : (reportedProfitTargetBalance ?? metrics?.profitTargetBalance ?? balance)

    const resetExpectationActive = (metrics as any)?.expectedBalanceOperationType === 'PHASE_RESET'
    const resetExpectedAmount = (metrics as any)?.expectedBalanceOperationAmount as number | null | undefined
    const resetAmountMatches = resetExpectationActive
      && resetExpectedAmount != null
      && Number.isFinite(resetExpectedAmount)
      && Math.abs(balance - resetExpectedAmount) <= Math.max(1, Math.abs(resetExpectedAmount) * 0.02)

    if (resetAmountMatches || resetDeal) {
      await prisma.cTraderAccountMetric.update({
        where: { accountId: account.id },
        data: {
          expectedBalanceChange: resetAmountMatches ? false : (metrics as any)?.expectedBalanceChange ?? false,
          expectedChangeExpiresAt: null,
          expectedBalanceOperationType: null,
          expectedBalanceOperationExpiresAt: null,
          expectedBalanceOperationAmount: null,
          minEquity: balance,
          highestBalance: balance,
          breachBalance: balance,
          dailyStartAt: dailyDdEnabled ? now : null,
          dailyHighBalance: dailyDdEnabled ? balance : 0,
          dailyBreachBalance: dailyDdEnabled
            ? balance - (accountData.dailyDdAmount ?? 0)
            : 0,
          dailyLowEquity: null,
          drawdownPercent: null,
          dailyDrawdownPercent: null,
          shortDurationViolation: false,
          durationViolationsCount: 0,
          processedTradeIds: [],
          totalTrades: 0,
          tradingDaysCount: 0,
          tradingCycleStart: null,
          tradingCycleSource: null,
          firstTradeAt: null,
          stageElapsedHours: 0,
        },
      })
      if (metrics) {
        metrics.expectedBalanceChange = false
        metrics.expectedChangeExpiresAt = null
        ;(metrics as any).expectedBalanceOperationType = null
        ;(metrics as any).expectedBalanceOperationExpiresAt = null
        ;(metrics as any).expectedBalanceOperationAmount = null
        ;(metrics as any).minEquity = balance
        ;(metrics as any).highestBalance = balance
        ;(metrics as any).breachBalance = balance
        ;(metrics as any).dailyStartAt = dailyDdEnabled ? now : null
        ;(metrics as any).dailyHighBalance = dailyDdEnabled ? balance : 0
        ;(metrics as any).dailyBreachBalance = dailyDdEnabled
          ? balance - (accountData.dailyDdAmount ?? 0)
          : 0
        ;(metrics as any).shortDurationViolation = false
        ;(metrics as any).durationViolationsCount = 0
        ;(metrics as any).processedTradeIds = []
        ;(metrics as any).totalTrades = 0
        ;(metrics as any).firstTradeAt = null
        ;(metrics as any).stageElapsedHours = 0
      }
    }

    const normalizedChallengeType = String(accountData.challengeType ?? '').toLowerCase()
    const normalizedPhase = String(accountData.phase ?? '').toLowerCase()
    const isMultiPhase = ['two_step', 'ngn_standard', 'ngn_flexi'].includes(normalizedChallengeType)
    const isAttic = normalizedChallengeType === 'attic'
    const isInstantFunded = normalizedChallengeType === 'instant_funded'
    const isFundedPhase = normalizedPhase === 'funded'

    const objectiveRules = await getObjectiveRules(accountData.challengeType, accountData.phase)
    const stageTimeLimitHours = (() => {
      const raw = objectiveRules.withdrawalSchedule
      void raw
      return null
    })()
    const rawTimeLimit = await (async () => {
      try {
        const config = await getObjectiveRules(accountData.challengeType, accountData.phase)
        return config
      } catch {
        return null
      }
    })()
    const timeLimitHours = (() => {
      const phaseConfig = rawTimeLimit
      void phaseConfig
      if (String(accountData.challengeType ?? '').toLowerCase() === 'attic') {
        return 24
      }
      return null
    })()

    const provisionalPassed = reportedPassed != null
      ? reportedPassed
      : !isInstantFunded
      && !isFundedPhase
      && profitTargetBalance != null
      && equity >= profitTargetBalance
      && minTradingDaysMet

    let breachReason: string | null = isMt5Payload
      ? reportedBreachReason
      : (reportedBreachReason ?? (metrics as any)?.breachReason ?? null)
    const awaitingReset = account.status?.toLowerCase() === 'awaiting_reset'
    const resetGuardActive = !breachReason && (awaitingReset || resetExpectationActive)

    console.info('[metrics] drawdown inputs', {
      accountNumber: account.accountNumber,
      minEquity: guardedMinEquity,
      reportedMinEquity,
      breachBalance,
      dailyBreachBalance: dailyDdEnabled ? dailyBreachBalance : null,
    })

    if (breachReason) {
      // keep breached status locked once triggered
    } else if (isMt5Payload) {
      // MT5 breach authority comes from the risk engine verdict only.
      // Keep backend numeric calculations for UI/progress tracking, but do not
      // independently infer breach status when the engine says breach_reason is null.
    } else if (resetGuardActive) {
      // Skip DD/fraud checks during a reset window to avoid false breaches.
    } else if (unsupportedTrade) {
      breachReason = 'UNSUPPORTED_SYMBOL'
    } else if (timeLimitHours != null && stageElapsedHours > timeLimitHours && !provisionalPassed) {
      breachReason = 'TIME_LIMIT'
    } else if ((isMt5Payload ? effectiveEquityLow : guardedMinEquity) < breachBalance) {
      breachReason = 'MAX_DRAWDOWN'
    } else if (dailyDdEnabled && (equity < dailyBreachBalance || (isMt5Payload ? effectiveEquityLow : guardedMinEquity) < dailyBreachBalance)) {
      breachReason = 'DAILY_DRAWDOWN'
    } else if (shortDurationViolation) {
      breachReason = 'MIN_TRADE_DURATION'
    }

    
    const breached = breachReason != null
    const wasBreached = account.status?.toLowerCase() === 'breached'
    const wasPassed = ['awaiting_reset', 'passed', 'completed'].includes(account.status?.toLowerCase() ?? '')
    const isAdminChecking = account.status?.toLowerCase() === 'admin_checking'
    const passed = !breached && provisionalPassed
    void normalizedChallengeType
    void normalizedPhase

    const expectedStatus = breached
      ? 'breached'
      : passed
        ? 'passed'
        : account.status
    const statusWillChange = expectedStatus && account.status?.toLowerCase() !== expectedStatus

    const breachEventTimeMs = (() => {
      if (!reportedBreachEvent || typeof reportedBreachEvent !== 'object') return null
      const event = reportedBreachEvent as { [key: string]: unknown }
      const timeMs = event.time_ms ?? event.closed_time_ms ?? event.timestamp_ms
      if (typeof timeMs === 'number' && Number.isFinite(timeMs)) {
        return timeMs
      }
      if (typeof timeMs === 'string') {
        const parsed = Number(timeMs)
        if (Number.isFinite(parsed)) return parsed
      }
      const isoCandidate = event.time ?? event.timestamp
      if (typeof isoCandidate === 'string') {
        const parsedDate = new Date(isoCandidate)
        if (Number.isFinite(parsedDate.getTime())) return parsedDate.getTime()
      }
      return null
    })()
    const breachTimestamp = breachEventTimeMs != null
      ? new Date(breachEventTimeMs)
      : (payload.timestamp ? new Date(payload.timestamp) : now)
    const resolvedBreachTimestamp = Number.isFinite(breachTimestamp.getTime())
      ? breachTimestamp
      : now

    if (breached && !wasBreached) {
      console.warn('[ctrader-metrics] Breach detected', {
        accountNumber: account.accountNumber,
        breachReason,
        balance,
        equity,
        highestBalance,
        breachBalance,
        dailyHighBalance: dailyStartBalance,
        dailyBreachBalance,
        maxDdAmount: accountData.maxDdAmount,
        dailyDdAmount: accountData.dailyDdAmount,
        minTradeDurationMinutes: accountData.minTradeDurationMinutes,
        durationViolationsCount,
        shortDurationViolation,
        payloadTimestamp: payload.timestamp ?? null,
      })
    }

    const transactionSteps: Prisma.PrismaPromise<unknown>[] = []
    transactionSteps.push(prisma.cTraderAccountMetric.upsert({
      where: { accountId: account.id },
      create: {
        accountId: account.id,
        balance,
        equity,
        unrealizedPnl: derivedUnrealizedPnl,
        maxPermittedLossLeft: breachBalance - equity,
        highestBalance,
        breachBalance,
        profitTargetBalance,
        winRate: metrics?.winRate ?? 0,
        closedTradesCount: metrics?.closedTradesCount ?? 0,
        winningTradesCount: metrics?.winningTradesCount ?? 0,
        lotsTradedTotal: metrics?.lotsTradedTotal ?? 0,
        todayClosedPnl: metrics?.todayClosedPnl ?? 0,
        todayTradesCount: metrics?.todayTradesCount ?? 0,
        todayLotsTotal: metrics?.todayLotsTotal ?? 0,
        minTradingDaysRequired: accountData.minTradingDaysRequired ?? 0,
        minTradingDaysMet,
        stageElapsedHours,
        scalpingViolationsCount: metrics?.scalpingViolationsCount ?? 0,
        durationViolationsCount,
        processedTradeIds: Array.from(processedTradeIds),
        dailyStartAt: dailyDdEnabled ? (isNewDay ? now : dailyStartAt) : null,
        dailyHighBalance: dailyDdEnabled ? dailyStartBalance : 0,
        dailyBreachBalance: dailyDdEnabled ? dailyBreachBalance : 0,
        dailyLowEquity: isMt5Payload ? reportedDailyLowEquity : null,
        drawdownPercent: derivedDrawdownPercent,
        dailyDrawdownPercent: derivedDailyDrawdownPercent,
        firstTradeAt,
        totalTrades,
        tradingDaysCount: reportedTradingDaysCount ?? null,
        tradingCycleStart: tradingCycleStart ?? null,
        tradingCycleSource: tradingCycleSource ?? null,
        shortDurationViolation,
        breachReason,
        minEquity: guardedMinEquity,
        minEquityNote: reportedMinEquityNote,
        lastBalance: balance,
        lastEquity: equity,
        engineId: payload.engine_id ?? (metrics as any)?.engineId ?? null,
        latencyMs: payload.latency_ms ?? (metrics as any)?.latencyMs ?? null,
        expectedBalanceChange: (metrics as any)?.expectedBalanceChange ?? false,
        expectedChangeExpiresAt: (metrics as any)?.expectedChangeExpiresAt ?? null,
        expectedBalanceOperationType: (metrics as any)?.expectedBalanceOperationType ?? null,
        expectedBalanceOperationExpiresAt: (metrics as any)?.expectedBalanceOperationExpiresAt ?? null,
        expectedBalanceOperationAmount: (metrics as any)?.expectedBalanceOperationAmount ?? null,
        breachEvent: resolvedBreachEvent,
        tradeDurationViolations: resolvedTradeViolations,
        capturedAt: now,
      } as Prisma.CTraderAccountMetricUncheckedCreateInput,
      update: {
        balance,
        equity,
        unrealizedPnl: derivedUnrealizedPnl,
        maxPermittedLossLeft: breachBalance - equity,
        highestBalance,
        breachBalance,
        profitTargetBalance,
        minTradingDaysRequired: accountData.minTradingDaysRequired ?? 0,
        minTradingDaysMet,
        stageElapsedHours,
        durationViolationsCount,
        processedTradeIds: Array.from(processedTradeIds),
        dailyStartAt: dailyDdEnabled ? (isNewDay ? now : dailyStartAt) : null,
        dailyHighBalance: dailyDdEnabled ? dailyStartBalance : 0,
        dailyBreachBalance: dailyDdEnabled ? dailyBreachBalance : 0,
        dailyLowEquity: isMt5Payload ? reportedDailyLowEquity : null,
        drawdownPercent: derivedDrawdownPercent,
        dailyDrawdownPercent: derivedDailyDrawdownPercent,
        firstTradeAt,
        totalTrades,
        tradingDaysCount: reportedTradingDaysCount ?? null,
        tradingCycleStart: tradingCycleStart ?? null,
        tradingCycleSource: tradingCycleSource ?? null,
        shortDurationViolation,
        breachReason,
        minEquity: guardedMinEquity,
        minEquityNote: reportedMinEquityNote,
        lastBalance: balance,
        lastEquity: equity,
        engineId: payload.engine_id ?? (metrics as any)?.engineId ?? null,
        latencyMs: payload.latency_ms ?? (metrics as any)?.latencyMs ?? null,
        expectedBalanceChange: (metrics as any)?.expectedBalanceChange ?? false,
        expectedChangeExpiresAt: (metrics as any)?.expectedChangeExpiresAt ?? null,
        expectedBalanceOperationType: (metrics as any)?.expectedBalanceOperationType ?? null,
        expectedBalanceOperationExpiresAt: (metrics as any)?.expectedBalanceOperationExpiresAt ?? null,
        expectedBalanceOperationAmount: (metrics as any)?.expectedBalanceOperationAmount ?? null,
        breachEvent: resolvedBreachEvent,
        tradeDurationViolations: resolvedTradeViolations,
        capturedAt: now,
      } as Prisma.CTraderAccountMetricUncheckedUpdateInput,
    }))
    if (breached) {
      transactionSteps.push(prisma.cTraderAccount.update({
        where: { id: account.id },
        data: {
          status: 'breached',
          breachedAt: resolvedBreachTimestamp,
        },
      }))
    } else if (isAdminChecking && !breached) {
      transactionSteps.push(prisma.cTraderAccount.update({
        where: { id: account.id },
        data: {
          status: 'active',
        },
      }))
    }

    await prisma.$transaction(transactionSteps)

    if (dailyPnlSummary.length > 0) {
      await prisma.$transaction(
        dailyPnlSummary.map((entry) => prisma.accountDailyPnl.upsert({
          where: {
            accountId_date: {
              accountId: account.id,
              date: entry.date,
            },
          },
          create: {
            accountId: account.id,
            date: entry.date,
            pnl: entry.pnl,
          },
          update: {
            pnl: entry.pnl,
          },
        })),
      )
    }

    if (breached) {
      try {
        await pushActiveAccountRemove(account.accountNumber, breachReason ?? 'breached')
      } catch (error) {
        console.error('Failed to push active account removal', error)
      }
    }

    if (breached && !wasBreached && accountData.user?.email) {
      try {
        await sendEmailOnce({
          type: 'ACCOUNT_BREACHED',
          accountId: account.id,
          userId: accountData.userId ?? undefined,
          send: async () => {
            await sendUnifiedEmail({
              to: accountData.user.email,
              subject: '⚠️ Account Breached',
              title: 'Account Breached',
              subtitle: 'We detected a rule violation on your account',
              content: 'Your account has been marked as breached due to a rule violation. Please review the reason below and contact support if you need help.',
              buttonText: 'Go to Dashboard',
              infoBox: `Account Number: ${account.accountNumber}<br>Reason: ${breachReason ?? 'Rule violation'}<br>Balance: ${balance}<br>${breachReason === 'DAILY_DRAWDOWN' ? `Min Equity: ${minEquity}` : `Equity: ${equity}`}`,
            })
          },
        })
      } catch (error) {
        console.error('Failed to send breach email', error)
      }
    }

    let nextStageAssigned: boolean | null = null
    let nextStageChallengeId: string | null = null
    let nextStageAccountNumber: string | null = null

    if (passed && !breached && accountData.userId && !wasPassed) {
      const nextStageCandidate = isAttic
        ? 'phase_1'
        : isMultiPhase
          ? (normalizedPhase === 'phase_1' ? 'phase_2' : normalizedPhase === 'phase_2' ? 'funded' : null)
          : (normalizedPhase === 'phase_1' ? 'funded' : null)

      if (nextStageCandidate) {
        try {
          const nextChallengeType = isAttic ? 'ngn_standard' : (accountData.challengeType ?? 'two_step')
          const nextAccountSize = isAttic ? '₦200,000' : accountData.accountSize
          const assigned = await assignReadyAccountFromPool({
            userId: accountData.userId,
            challengeType: nextChallengeType,
            phase: nextStageCandidate,
            accountSize: nextAccountSize,
            currency: resolveChallengeCurrency(nextChallengeType, accountData.currency ?? null),
            baseChallengeId: normalizeChallengeBase(accountData.challengeId),
            platform: accountData.platform ?? 'ctrader',
          })

          if (assigned) {
            await prisma.cTraderAccount.update({
              where: { id: account.id },
              data: {
                status: 'completed',
                passedAt: now,
              },
            })

            const resolvedPlatform = String(assigned.platform ?? accountData.platform ?? 'ctrader').toLowerCase()
            if (resolvedPlatform === 'mt5') {
              await prisma.cTraderAccount.update({
                where: { id: assigned.id },
                data: { status: 'active', accessStatus: 'granted', accessGrantedAt: new Date() },
              })
            } else if (accountData.user?.email) {
              try {
                await requestAccountAccess({
                  user_email: accountData.user.email,
                  account_number: assigned.accountNumber,
                  broker: assigned.brokerName,
                  platform: resolvedPlatform,
                  ...(accountData.user.fullName ? { user_name: accountData.user.fullName } : {}),
                  ...(assigned.challengeType ? { account_type: assigned.challengeType } : {}),
                  ...(assigned.phase ? { account_phase: assigned.phase } : {}),
                  ...(assigned.accountSize ? { account_size: assigned.accountSize } : {}),
                  ...(assigned.mt5Login ? { mt5_login: assigned.mt5Login } : {}),
                  ...(assigned.mt5Server ? { mt5_server: assigned.mt5Server } : {}),
                  ...(assigned.mt5Password ? { mt5_password: assigned.mt5Password } : {}),
                })
              } catch (error) {
                console.error('Failed to request next-stage account access', {
                  accountNumber: assigned.accountNumber,
                  error,
                })
              }
            }

            try {
              await pushActiveAccountRemove(account.accountNumber, 'phase_passed')
            } catch (error) {
              console.error('Failed to remove passed account from active engine list', error)
            }

            nextStageAssigned = true
            nextStageChallengeId = assigned.challengeId
            nextStageAccountNumber = assigned.accountNumber
          } else {
            await prisma.cTraderAccount.update({
              where: { id: account.id },
              data: {
                status: 'passed',
                passedAt: now,
              },
            })
            nextStageAssigned = false
          }
        } catch (error) {
          console.error('Failed to assign fresh next-stage account on pass', {
            accountNumber: account.accountNumber,
            error,
          })
          await prisma.cTraderAccount.update({
            where: { id: account.id },
            data: {
              status: 'passed',
              passedAt: now,
            },
          })
          nextStageAssigned = false
        }
      }
    }

    const normalizedPhaseKey = String(accountData.phase ?? '').toLowerCase()
    const nextPhaseKey = isAttic
      ? 'phase_1'
      : isMultiPhase
      ? (normalizedPhaseKey === 'phase_1' ? 'phase_2' : normalizedPhaseKey === 'phase_2' ? 'funded' : normalizedPhaseKey)
      : (normalizedPhaseKey === 'phase_1' ? 'funded' : normalizedPhaseKey)
    const shouldIssueCertificate = nextPhaseKey === 'funded'
    if (passed && !breached && accountData.user?.email && !wasPassed) {
      try {
        await sendEmailOnce({
          type: 'PHASE_PASS',
          accountId: account.id,
          userId: accountData.userId ?? undefined,
          send: async () => {
            let attachments: Array<{ filename: string; content: Buffer; contentType?: string }> | undefined
            if (shouldIssueCertificate) {
              const certificate = await createPassedChallengeCertificate({
                userId: accountData.userId,
                accountId: account.id,
                challengeId: accountData.challengeId,
                phase: accountData.phase,
                challengeType: accountData.challengeType,
                accountSize: accountData.accountSize,
              })
              attachments = certificate.certificateUrl
                ? [
                  await fetchRemoteAttachment({
                    url: certificate.certificateUrl,
                    filename: 'challenge-passed-certificate.png',
                    contentType: 'image/png',
                  }),
                ]
                : undefined
            }

            await sendUnifiedEmail({
              to: accountData.user.email,
              subject: '🎉 Phase Passed – Action in Progress',
              title: 'Phase Passed',
              subtitle: nextStageAssigned ? 'Your new account has been issued' : 'Your next-phase account is being prepared',
              content: isAttic
                ? (nextStageAssigned
                  ? `Congratulations! You have passed the Attic phase. A fresh ₦200,000 NGN Standard Challenge account for Phase 1 has been issued to you${nextStageAccountNumber ? ` (${nextStageAccountNumber})` : ''}.`
                  : 'Congratulations! You have passed the Attic phase. Your fresh ₦200,000 NGN Standard Challenge account for Phase 1 is being prepared.')
                : (nextStageAssigned
                  ? `Congratulations! You have passed this phase. A fresh account for ${nextPhaseKey.replace('_', ' ')} has been issued to you${nextStageAccountNumber ? ` (${nextStageAccountNumber})` : ''}.`
                  : `Congratulations! You have passed this phase. Your fresh account for ${nextPhaseKey.replace('_', ' ')} is being prepared.`),
              buttonText: 'View Dashboard',
              infoBox: `Previous Account: ${account.accountNumber}<br>Account Size: ${accountData.accountSize}<br>Challenge: ${accountData.challengeType}<br>New Phase: ${nextPhaseKey.replace('_', ' ')}${nextStageAccountNumber ? `<br>New Account: ${nextStageAccountNumber}` : ''}`,
              ...(attachments ? { attachments } : {}),
            })
          },
        })
      } catch (error) {
        console.error('Failed to send phase passed email', error)
      }
    }

    if (passed && accountData.userId && !resetExpectationActive) {
      const profitBase = accountData.initialBalance ?? 0
      const profit = Math.max(0, balance - profitBase)
      try {
        await notifyFinanceEngine({
          type: 'PHASE_PASS',
          account: String(account.accountNumber),
          platform: normalizedPayloadPlatform,
          profit,
          targetBalance: accountData.initialBalance ?? balance,
          currentPhase: accountData.phase,
          nextPhase: nextPhaseKey,
          challengeType: accountData.challengeType,
          ownerEmail: accountData.user?.email ?? undefined,
        })
      } catch (error) {
        console.error('Failed to notify finance engine about phase pass', error)
      }
    }

    if (accountData.userId && (statusWillChange || nextStageAssigned !== null)) {
      await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', accountData.userId]))
      await clearCacheByPrefix(buildCacheKey(['payouts', 'summary', accountData.userId]))
    }

    res.json({
      account_number: account.accountNumber,
      balance,
      breachReason,
      min_equity: guardedMinEquity,
      breach_threshold: breachBalance,
      breach_reason: breachReason,
      breach_event: resolvedBreachEvent,
      trade_duration_violations: resolvedTradeViolations,
      status: breached ? 'breached' : passed ? (nextStageAssigned ? 'completed' : 'passed') : 'active',
      next_stage_assigned: nextStageAssigned,
      next_stage_challenge_id: nextStageChallengeId,
      next_stage_account_number: nextStageAccountNumber,
    })
  } catch (err) {
    console.log('❌ METRICS ERROR:', err)
    console.log('Payload:', req.body)
    console.error('[metrics] ingest error', {
      accountNumber: (req.body as MetricsPayload | undefined)?.account_number,
      platform: (req.body as MetricsPayload | undefined)?.platform,
      payloadKeys: req.body ? Object.keys(req.body) : [],
    })
    console.error(err)
    return res.status(500).json({
      message: 'Internal error',
      error: err instanceof Error ? err.message : String(err),
    })
  }
}