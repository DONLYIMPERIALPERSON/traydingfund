import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Prisma } from '@prisma/client'
import { env } from '../../config/env'
import { ApiError } from '../../common/errors'
import { buildObjectiveFields } from './ctrader.objectives'
import { assignReadyAccountFromPool, normalizeChallengeBase } from './ctrader.assignment'
import { pushActiveAccountRemove } from '../../services/ctraderEngine.service'
import { requestAccountAccess } from '../../services/accessEngine.service'
import { createPassedChallengeCertificate } from '../../services/certificate.service'
import { fetchRemoteAttachment, sendUnifiedEmail } from '../../services/email.service'
import { buildCacheKey, clearCacheByPrefix } from '../../common/cache'

type TradePayload = {
  ticket?: string
  position_id?: string
  open_time?: string
  close_time?: string
  profit?: number
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
  balance?: number
  equity?: number
  trades?: TradePayload[]
  positions?: PositionPayload[]
  timestamp?: string
}

const DAY_MS = 24 * 60 * 60 * 1000

const isSameDay = (lhs: Date, rhs: Date) =>
  lhs.getUTCFullYear() === rhs.getUTCFullYear()
  && lhs.getUTCMonth() === rhs.getUTCMonth()
  && lhs.getUTCDate() === rhs.getUTCDate()

const parseDate = (value?: string) => (value ? new Date(value) : null)

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
    const secret = req.header('X-ENGINE-SECRET')
    if (!secret || secret !== env.ctraderEngineSecret) {
      throw new ApiError('Unauthorized engine request', 401)
    }

    const payload = req.body as MetricsPayload
    if (!payload.account_number || payload.balance == null || payload.equity == null) {
      throw new ApiError('account_number, balance, and equity are required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: { accountNumber: payload.account_number },
      include: { metrics: true, user: true },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
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

    const equity = payload.equity
    const balance = payload.balance

    const highestBalance = Math.max(metrics?.highestBalance ?? accountData.initialBalance ?? balance, balance)
    const breachBalance = accountData.maxDdAmount != null
      ? highestBalance - accountData.maxDdAmount
      : (metrics?.breachBalance ?? balance)

    const dailyStartAt = (metrics as any)?.dailyStartAt ? new Date((metrics as any).dailyStartAt) : null
    const isNewDay = !dailyStartAt || !isSameDay(dailyStartAt, now)
    const dailyHighBalance = isNewDay
      ? balance
      : Math.max((metrics as any)?.dailyHighBalance ?? balance, balance)
    const dailyBreachBalance = accountData.dailyDdAmount != null
      ? dailyHighBalance - accountData.dailyDdAmount
      : ((metrics as any)?.dailyBreachBalance ?? balance)

    const trades = payload.trades ?? []
    const positions = payload.positions ?? []
    const tradeEvents = trades.length
      ? trades
      : positions.map((position) => ({
        position_id: position.position_id,
        open_time: position.open_time,
        close_time: position.close_time,
      }))
    const closedTrades = tradeEvents.filter((trade) => trade.open_time && trade.close_time)
    const totalTrades = ((metrics as any)?.totalTrades ?? 0) + closedTrades.length
    const shortDurationViolation = closedTrades.some((trade) => {
      const duration = calculateTradeDurationMinutes(trade)
      return duration != null && accountData.minTradeDurationMinutes != null && duration < accountData.minTradeDurationMinutes
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

    let breachReason: string | null = (metrics as any)?.breachReason ?? null
    if (breachReason) {
      // keep breached status locked once triggered
    } else if (equity < breachBalance) {
      breachReason = 'MAX_DRAWDOWN'
    } else if (equity < dailyBreachBalance) {
      breachReason = 'DAILY_DRAWDOWN'
    } else if (shortDurationViolation || (metrics as any)?.shortDurationViolation) {
      breachReason = 'MIN_TRADE_DURATION'
    }

    const normalizedChallengeType = String(accountData.challengeType ?? '').toLowerCase()
    const normalizedPhase = String(accountData.phase ?? '').toLowerCase()
    const isInstantFunded = normalizedChallengeType === 'instant_funded'
    const breached = breachReason != null
    const wasBreached = account.status?.toLowerCase() === 'breached'
    const passed = !breached
      && !isInstantFunded
      && profitTargetBalance != null
      && equity >= profitTargetBalance
      && minTradingDaysMet
    const shouldAutoPromote = passed && !isInstantFunded
    const nextPhase = normalizedChallengeType === 'two_step'
      ? (normalizedPhase === 'phase_1' ? 'phase_2' : normalizedPhase === 'phase_2' ? 'funded' : null)
      : normalizedChallengeType === 'one_step'
        ? (normalizedPhase === 'phase_1' ? 'funded' : null)
        : null

    const expectedStatus = breached
      ? 'breached'
      : passed
        ? (accountData.phase === 'funded' ? 'funded' : 'passed')
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
        dailyStartAt: isNewDay ? now : dailyStartAt,
        dailyHighBalance,
        dailyBreachBalance,
        firstTradeAt,
        totalTrades,
        shortDurationViolation: shortDurationViolation || (metrics?.shortDurationViolation ?? false),
        breachReason,
        lastBalance: balance,
        lastEquity: equity,
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
        dailyStartAt: isNewDay ? now : dailyStartAt,
        dailyHighBalance,
        dailyBreachBalance,
        firstTradeAt,
        totalTrades,
        shortDurationViolation: shortDurationViolation || (metrics?.shortDurationViolation ?? false),
        breachReason,
        lastBalance: balance,
        lastEquity: equity,
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
          status: accountData.phase === 'funded' ? 'funded' : 'passed',
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
        await sendUnifiedEmail({
          to: accountData.user.email,
          subject: 'Account Breach Notice',
          title: 'Account Breach Notice',
          subtitle: 'We detected a rule violation on your account',
          content: 'Your account has been marked as breached due to a rule violation. Please review your dashboard for details and contact support if you need assistance.',
          buttonText: 'Go to Dashboard',
          infoBox: `Account Number: ${account.accountNumber}<br>Reason: ${breachReason ?? 'Rule violation'}<br>Balance: ${balance}<br>Equity: ${equity}`,
        })
      } catch (error) {
        console.error('Failed to send breach email', error)
      }
    }

    if (passed && nextPhase === 'funded') {
      try {
        const certificate = await createPassedChallengeCertificate({
          userId: accountData.userId,
          accountId: account.id,
          challengeId: accountData.challengeId,
          phase: accountData.phase,
          challengeType: accountData.challengeType,
          accountSize: accountData.accountSize,
        })

        if (accountData.user?.email) {
          const attachments = certificate.certificateUrl
            ? [
              await fetchRemoteAttachment({
                url: certificate.certificateUrl,
                filename: 'challenge-passed-certificate.png',
                contentType: 'image/png',
              }),
            ]
            : undefined

          await sendUnifiedEmail({
            to: accountData.user.email,
            subject: 'Congratulations! You are now funded',
            title: 'Challenge Passed',
            subtitle: 'You have reached the funded stage',
            content: 'Outstanding performance! You have successfully completed your challenge and moved to the funded stage. Keep up the great work.',
            buttonText: 'View Dashboard',
            infoBox: `Account Size: ${accountData.accountSize}<br>Challenge: ${accountData.challengeType}<br>Phase: ${accountData.phase}<br>Account Number: ${account.accountNumber}`,
            ...(attachments ? { attachments } : {}),
          })
        }
      } catch (error) {
        console.error('Failed to create passed challenge certificate', error)
      }
    }

    let nextStageAssigned: boolean | null = null
    let nextStageChallengeId: string | null = null
    if (shouldAutoPromote && nextPhase) {
      const baseChallengeId = normalizeChallengeBase(accountData.challengeId ?? '')
      const assignment = await assignReadyAccountFromPool({
        userId: accountData.userId,
        challengeType: accountData.challengeType,
        phase: nextPhase,
        accountSize: accountData.accountSize,
        currency: accountData.currency ?? 'USD',
        baseChallengeId,
      })

      if (assignment) {
        nextStageAssigned = true
        nextStageChallengeId = assignment.challengeId
        await prisma.cTraderAccount.update({
          where: { id: account.id },
          data: { status: 'completed' },
        })
        const userEmail = accountData.user?.email
        if (userEmail) {
          await requestAccountAccess({
            user_email: userEmail,
            user_name: accountData.user?.fullName ?? undefined,
            account_type: accountData.challengeType ?? undefined,
            account_phase: nextPhase ?? undefined,
            account_size: assignment.accountSize ?? accountData.accountSize ?? undefined,
            account_number: assignment.accountNumber,
            broker: assignment.brokerName,
            platform: 'ctrader',
          })
        }
        try {
          await pushActiveAccountRemove(account.accountNumber, 'passed')
        } catch (error) {
          console.error('Failed to push active account removal', error)
        }
      } else {
        nextStageAssigned = false
      }
    }

    if (accountData.userId && (statusWillChange || nextStageAssigned !== null)) {
      await clearCacheByPrefix(buildCacheKey(['trader', 'challenges', accountData.userId]))
      await clearCacheByPrefix(buildCacheKey(['payouts', 'summary', accountData.userId]))
    }

    res.json({
      account_number: account.accountNumber,
      balance,
      equity,
      breach_reason: breachReason,
      status: breached ? 'breached' : passed ? 'passed' : 'active',
      next_stage_assigned: nextStageAssigned,
      next_stage_challenge_id: nextStageChallengeId,
    })
  } catch (err) {
    next(err as Error)
  }
}