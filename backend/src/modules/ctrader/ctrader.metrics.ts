import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Prisma } from '@prisma/client'
import { env } from '../../config/env'
import { ApiError } from '../../common/errors'
import { buildObjectiveFields } from './ctrader.objectives'
import { pushActiveAccountRemove } from '../../services/ctraderEngine.service'
import { notifyFinanceEngine } from '../../services/financeEngine.service'
import { createPassedChallengeCertificate } from '../../services/certificate.service'
import { fetchRemoteAttachment, sendUnifiedEmail } from '../../services/email.service'
import { sendEmailOnce } from '../../services/emailLog.service'
import { buildCacheKey, clearCacheByPrefix } from '../../common/cache'
import supportedSymbolsConfig from '../../config/supportedSymbols.json'

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
  min_equity?: number
  trades?: TradePayload[]
  positions?: PositionPayload[]
  timestamp?: string
  engine_id?: string
  latency_ms?: number
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

    const payload = req.body as MetricsPayload
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

    const normalizedPayloadPlatform = String(payload.platform).toLowerCase()
    const normalizedAccountPlatform = String(account.platform ?? 'ctrader').toLowerCase()
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
    const reportedMinEquity = Number.isFinite(payload.min_equity) ? Number(payload.min_equity) : null
    const priorMinEquity = (metrics as any)?.minEquity ?? null
    const minEquity = reportedMinEquity != null
      ? (priorMinEquity != null ? Math.min(priorMinEquity, reportedMinEquity) : reportedMinEquity)
      : (priorMinEquity ?? equity)

    const highestBalance = Math.max(metrics?.highestBalance ?? accountData.initialBalance ?? equity, equity)
    const breachBalance = accountData.maxDdAmount != null
      ? highestBalance - accountData.maxDdAmount
      : (metrics?.breachBalance ?? balance)

    const dailyDdEnabled = accountData.dailyDdAmount != null && accountData.dailyDdAmount > 0
    const dailyStartAt = dailyDdEnabled && (metrics as any)?.dailyStartAt
      ? new Date((metrics as any).dailyStartAt)
      : null
    const isNewDay = dailyDdEnabled
      && (!dailyStartAt || toUtcDateKey(dailyStartAt) !== toUtcDateKey(now))
    const dailyHighBalance = dailyDdEnabled
      ? (isNewDay
        ? equity
        : Math.max((metrics as any)?.dailyHighBalance ?? equity, equity))
      : 0
    const dailyBreachBalance = dailyDdEnabled
      ? dailyHighBalance - accountData.dailyDdAmount
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
        ...(normalizedDealType ? { dealType: normalizedDealType } : {}),
      }
    })
    const closedTrades = normalizedTradeEvents.filter((trade) => trade.open_time && trade.close_time)
    const totalTrades = ((metrics as any)?.totalTrades ?? 0) + closedTrades.length
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
    const minDurationSeconds = accountData.minTradeDurationMinutes != null
      ? accountData.minTradeDurationMinutes * 60
      : MIN_TRADE_DURATION_SECONDS
    const newViolations = newlyProcessedTrades.filter((trade) => {
      const duration = calculateTradeDurationMinutes(trade)
      return duration != null && duration * 60 < minDurationSeconds
    }).length
    const durationViolationsCount = priorViolations + newViolations
    const shortDurationViolation = durationViolationsCount >= MAX_DURATION_VIOLATIONS
    const supportedSymbols = new Set(
      (supportedSymbolsConfig.supported_symbols ?? []).map((symbol) => String(symbol).toUpperCase())
    )
    const unsupportedTrade = normalizedTradeEvents.find((trade) => {
      const rawSymbol = trade.symbol ? String(trade.symbol) : ''
      const normalizedSymbol = rawSymbol ? normalizeSymbol(rawSymbol).toUpperCase() : ''
      return normalizedSymbol && !supportedSymbols.has(normalizedSymbol)
    })
    const firstTradeAt = (metrics as any)?.firstTradeAt
      ?? tradeEvents.map((trade) => parseDate(trade.open_time)).find(Boolean)
      ?? accountData.startedAt
      ?? accountData.assignedAt
      ?? null
    const stageElapsedHours = firstTradeAt
      ? Math.max(0, (now.getTime() - new Date(firstTradeAt).getTime()) / (60 * 60 * 1000))
      : (metrics?.stageElapsedHours ?? 0)
    const minTradingDaysMet = !!firstTradeAt
      && accountData.minTradingDaysRequired != null
      && now.getTime() >= firstTradeAt.getTime() + DAY_MS * accountData.minTradingDaysRequired

    const profitTargetBalance = accountData.profitTargetAmount != null && accountData.initialBalance != null
      ? accountData.initialBalance + accountData.profitTargetAmount
      : (metrics?.profitTargetBalance ?? balance)

    const resetExpectationActive = (metrics as any)?.expectedBalanceOperationType === 'PHASE_RESET'
    const resetExpectedAmount = (metrics as any)?.expectedBalanceOperationAmount as number | null | undefined
    const resetAmountMatches = resetExpectationActive
      && resetExpectedAmount != null
      && Number.isFinite(resetExpectedAmount)
      && Math.abs(balance - resetExpectedAmount) <= Math.max(1, Math.abs(resetExpectedAmount) * 0.02)

    if (resetAmountMatches) {
      await prisma.cTraderAccountMetric.update({
        where: { accountId: account.id },
        data: {
          expectedBalanceChange: false,
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
          shortDurationViolation: false,
          durationViolationsCount: 0,
          processedTradeIds: [],
          totalTrades: 0,
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

    let breachReason: string | null = (metrics as any)?.breachReason ?? null
    const awaitingReset = account.status?.toLowerCase() === 'awaiting_reset'
    const resetGuardActive = !breachReason && (awaitingReset || resetExpectationActive)

    console.info('[metrics] drawdown inputs', {
      accountNumber: account.accountNumber,
      minEquity,
      reportedMinEquity,
      breachBalance,
      dailyBreachBalance: dailyDdEnabled ? dailyBreachBalance : null,
    })

    if (breachReason) {
      // keep breached status locked once triggered
    } else if (resetGuardActive) {
      // Skip DD/fraud checks during a reset window to avoid false breaches.
    } else if (unsupportedTrade) {
      breachReason = 'UNSUPPORTED_SYMBOL'
    } else if (minEquity < breachBalance) {
      breachReason = 'MAX_DRAWDOWN'
    } else if (dailyDdEnabled && minEquity < dailyBreachBalance) {
      breachReason = 'DAILY_DRAWDOWN'
    } else if (shortDurationViolation) {
      breachReason = 'MIN_TRADE_DURATION'
    } else {
      const fraudTypes = new Set(['DEPOSIT', 'WITHDRAWAL', 'WITHDRAW', 'CREDIT', 'BALANCE'])
      const tradeDealTypes = trades
        .map((trade) => (trade as any)?.dealType)
        .filter(Boolean) as string[]
      const fraudDealType = tradeDealTypes.find((dealType) => fraudTypes.has(String(dealType).toUpperCase()))
      const hasFraudDeal = Boolean(fraudDealType)
      if (hasFraudDeal) {
        const expectedOperationType = (metrics as any)?.expectedBalanceOperationType as string | null | undefined
        const expectedOperationExpiresAt = (metrics as any)?.expectedBalanceOperationExpiresAt as Date | string | null | undefined
        const expectedOperationAmount = (metrics as any)?.expectedBalanceOperationAmount as number | null | undefined
        const hasValidExpectation = Boolean(
          (metrics as any)?.expectedBalanceChange
          && expectedOperationType
        )
        if (!hasValidExpectation) {
          if (normalizedPayloadPlatform === 'mt5') {
            console.warn('[mt5] Balance operation without expectation', {
              accountNumber: account.accountNumber,
              dealType: fraudDealType,
            })
          } else {
            breachReason = 'FRAUD_BALANCE_MANIPULATION'
          }
        } else if (expectedOperationAmount != null && Number.isFinite(expectedOperationAmount)) {
          const matchedTrade = trades.find((trade) => (
            String((trade as any)?.dealType ?? '').toUpperCase() === String(fraudDealType).toUpperCase()
          ))
          const rawAmount = Number(matchedTrade?.profit ?? (matchedTrade as { volume?: number } | null)?.volume ?? 0)
          const amountDiff = Math.abs(Math.abs(rawAmount) - Math.abs(expectedOperationAmount))
          const tolerance = Math.max(1, Math.abs(expectedOperationAmount) * 0.02)
          if (amountDiff > tolerance) {
            if (normalizedPayloadPlatform === 'mt5') {
              console.warn('[mt5] Balance operation amount mismatch', {
                accountNumber: account.accountNumber,
                dealType: fraudDealType,
                expectedOperationAmount,
                rawAmount,
              })
            } else {
              breachReason = 'FRAUD_AMOUNT_MISMATCH'
            }
          } else {
            await prisma.cTraderAccountMetric.update({
              where: { accountId: account.id },
              data: {
                expectedBalanceChange: false,
                expectedChangeExpiresAt: null,
                expectedBalanceOperationType: null,
                expectedBalanceOperationExpiresAt: null,
                expectedBalanceOperationAmount: null,
              },
            })
            if (metrics) {
              metrics.expectedBalanceChange = false
              metrics.expectedChangeExpiresAt = null
              ;(metrics as any).expectedBalanceOperationType = null
              ;(metrics as any).expectedBalanceOperationExpiresAt = null
              ;(metrics as any).expectedBalanceOperationAmount = null
            }
          }
        } else {
          await prisma.cTraderAccountMetric.update({
            where: { accountId: account.id },
            data: {
              expectedBalanceChange: false,
              expectedChangeExpiresAt: null,
              expectedBalanceOperationType: null,
              expectedBalanceOperationExpiresAt: null,
              expectedBalanceOperationAmount: null,
            },
          })
          if (metrics) {
            metrics.expectedBalanceChange = false
            metrics.expectedChangeExpiresAt = null
            ;(metrics as any).expectedBalanceOperationType = null
            ;(metrics as any).expectedBalanceOperationExpiresAt = null
            ;(metrics as any).expectedBalanceOperationAmount = null
          }
        }
      }
    }

    const normalizedChallengeType = String(accountData.challengeType ?? '').toLowerCase()
    const normalizedPhase = String(accountData.phase ?? '').toLowerCase()
    const isMultiPhase = ['two_step', 'ngn_standard', 'ngn_flexi'].includes(normalizedChallengeType)
    const isInstantFunded = normalizedChallengeType === 'instant_funded'
    const breached = breachReason != null
    const wasBreached = account.status?.toLowerCase() === 'breached'
    const wasPassed = account.status?.toLowerCase() === 'awaiting_reset'
    const isFundedPhase = normalizedPhase === 'funded'
    const passed = !breached
      && !isInstantFunded
      && !isFundedPhase
      && profitTargetBalance != null
      && equity >= profitTargetBalance
      && minTradingDaysMet
    void normalizedChallengeType
    void normalizedPhase

    const expectedStatus = breached
      ? 'breached'
      : passed
        ? 'awaiting_reset'
        : account.status
    const statusWillChange = expectedStatus && account.status?.toLowerCase() !== expectedStatus

    if (breached && !wasBreached) {
      console.warn('[ctrader-metrics] Breach detected', {
        accountNumber: account.accountNumber,
        breachReason,
        balance,
        equity,
        highestBalance,
        breachBalance,
        dailyHighBalance,
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
        unrealizedPnl: equity - balance,
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
        dailyHighBalance: dailyDdEnabled ? dailyHighBalance : 0,
        dailyBreachBalance: dailyDdEnabled ? dailyBreachBalance : 0,
        firstTradeAt,
        totalTrades,
        shortDurationViolation,
        breachReason,
        minEquity,
        lastBalance: balance,
        lastEquity: equity,
        engineId: payload.engine_id ?? (metrics as any)?.engineId ?? null,
        latencyMs: payload.latency_ms ?? (metrics as any)?.latencyMs ?? null,
        expectedBalanceChange: (metrics as any)?.expectedBalanceChange ?? false,
        expectedChangeExpiresAt: (metrics as any)?.expectedChangeExpiresAt ?? null,
        expectedBalanceOperationType: (metrics as any)?.expectedBalanceOperationType ?? null,
        expectedBalanceOperationExpiresAt: (metrics as any)?.expectedBalanceOperationExpiresAt ?? null,
        expectedBalanceOperationAmount: (metrics as any)?.expectedBalanceOperationAmount ?? null,
        capturedAt: now,
      } as Prisma.CTraderAccountMetricUncheckedCreateInput,
      update: {
        balance,
        equity,
        unrealizedPnl: equity - balance,
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
        dailyHighBalance: dailyDdEnabled ? dailyHighBalance : 0,
        dailyBreachBalance: dailyDdEnabled ? dailyBreachBalance : 0,
        firstTradeAt,
        totalTrades,
        shortDurationViolation,
        breachReason,
        minEquity,
        lastBalance: balance,
        lastEquity: equity,
        engineId: payload.engine_id ?? (metrics as any)?.engineId ?? null,
        latencyMs: payload.latency_ms ?? (metrics as any)?.latencyMs ?? null,
        expectedBalanceChange: (metrics as any)?.expectedBalanceChange ?? false,
        expectedChangeExpiresAt: (metrics as any)?.expectedChangeExpiresAt ?? null,
        expectedBalanceOperationType: (metrics as any)?.expectedBalanceOperationType ?? null,
        expectedBalanceOperationExpiresAt: (metrics as any)?.expectedBalanceOperationExpiresAt ?? null,
        expectedBalanceOperationAmount: (metrics as any)?.expectedBalanceOperationAmount ?? null,
        capturedAt: now,
      } as Prisma.CTraderAccountMetricUncheckedUpdateInput,
    }))
    if (breached) {
      transactionSteps.push(prisma.cTraderAccount.update({
        where: { id: account.id },
        data: {
          status: 'breached',
          breachedAt: now,
        },
      }))
    } else if (passed && account.status.toLowerCase() !== 'breached') {
      transactionSteps.push(prisma.cTraderAccount.update({
        where: { id: account.id },
        data: {
          status: 'awaiting_reset',
          passedAt: now,
        },
      }))
    }

    await prisma.$transaction(transactionSteps)

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
              infoBox: `Account Number: ${account.accountNumber}<br>Reason: ${breachReason ?? 'Rule violation'}<br>Balance: ${balance}<br>Equity: ${equity}`,
            })
          },
        })
      } catch (error) {
        console.error('Failed to send breach email', error)
      }
    }

    const normalizedPhaseKey = String(accountData.phase ?? '').toLowerCase()
    const nextPhaseKey = isMultiPhase
      ? (normalizedPhaseKey === 'phase_1' ? 'phase_2' : normalizedPhaseKey === 'phase_2' ? 'funded' : normalizedPhaseKey)
      : (normalizedPhaseKey === 'phase_1' ? 'funded' : normalizedPhaseKey)
    const shouldIssueCertificate = nextPhaseKey === 'funded'
    if (passed && !breached && accountData.user?.email && !wasPassed) {
      try {
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
          subtitle: 'Your account is being prepared for the next phase',
          content: `Congratulations! You have passed this phase. Your account is being prepared for the next phase (${nextPhaseKey.replace('_', ' ')}). No action is required, and your existing login credentials will remain the same.`,
          buttonText: 'View Dashboard',
          infoBox: `Account Size: ${accountData.accountSize}<br>Challenge: ${accountData.challengeType}<br>Phase: ${accountData.phase}<br>Account Number: ${account.accountNumber}`,
          ...(attachments ? { attachments } : {}),
        })
      } catch (error) {
        console.error('Failed to send phase passed email', error)
      }
    }

    if (passed && accountData.userId && !resetExpectationActive) {
      const profitBase = accountData.initialBalance ?? 0
      const profit = Math.max(0, balance - profitBase)
      const expectedOperationExpiresAt = null
      const resetBalance = accountData.initialBalance ?? Math.max(0, balance - profit)
      try {
        await prisma.cTraderAccountMetric.updateMany({
          where: { accountId: account.id },
          data: {
            expectedBalanceChange: true,
            expectedChangeExpiresAt: expectedOperationExpiresAt,
            expectedBalanceOperationType: 'PHASE_RESET',
            expectedBalanceOperationExpiresAt: expectedOperationExpiresAt,
            expectedBalanceOperationAmount: resetBalance,
          },
        })
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
          resetCommand: `/reset_done ${account.accountNumber}`,
        })
      } catch (error) {
        console.error('Failed to notify finance engine about phase pass', error)
      }
    }

    let nextStageAssigned: boolean | null = null
    let nextStageChallengeId: string | null = null

    if (accountData.userId && (statusWillChange || nextStageAssigned !== null)) {
      await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', accountData.userId]))
      await clearCacheByPrefix(buildCacheKey(['payouts', 'summary', accountData.userId]))
    }

    res.json({
      account_number: account.accountNumber,
      balance,
      equity,
      min_equity: minEquity,
      breach_threshold: breachBalance,
      breach_reason: breachReason,
      status: breached ? 'breached' : passed ? 'awaiting_reset' : 'active',
      next_stage_assigned: nextStageAssigned,
      next_stage_challenge_id: nextStageChallengeId,
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