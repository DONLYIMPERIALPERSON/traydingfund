import { Request, Response, NextFunction } from 'express'
import type { CTraderAccount, CTraderAccountMetric } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'

type AuthRequest = Request & { user?: { id: number; email: string } }

const ensureUser = (req: AuthRequest) => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }
  return req.user
}

const mapAccountStatus = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized === 'active') return 'Active'
  if (normalized === 'passed') return 'Passed'
  if (normalized === 'failed') return 'Failed'
  if (normalized === 'funded') return 'Funded'
  if (normalized === 'assigned') return 'Assigned'
  if (normalized === 'ready') return 'Ready'
  return status
}

const isActiveStatus = (status: string) => {
  const normalized = status.toLowerCase()
  return normalized === 'active' || normalized === 'assigned' || normalized === 'funded'
}

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      throw new ApiError('User not found', 404)
    }

    res.json({
      id: dbUser.id,
      descope_user_id: null,
      email: dbUser.email,
      full_name: dbUser.fullName,
      nick_name: dbUser.nickName,
      role: dbUser.role,
      status: dbUser.status,
      kyc_status: dbUser.kycStatus,
      use_nickname_for_certificates: true,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listChallengeAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const accounts: CTraderAccount[] = await prisma.cTraderAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    const mapped = accounts.map((account: CTraderAccount) => {
      const displayStatus = mapAccountStatus(account.status)
      return {
        challenge_id: account.challengeId,
        account_size: account.accountSize,
        challenge_type: account.phase.toLowerCase().includes('funded') ? 'Funded' : 'Challenge',
        phase: account.phase,
        objective_status: account.status.toLowerCase(),
        display_status: displayStatus,
        is_active: isActiveStatus(account.status),
        mt5_account: account.accountNumber,
        started_at: account.startedAt?.toISOString() ?? null,
        breached_at: account.breachedAt?.toISOString() ?? null,
        passed_at: account.passedAt?.toISOString() ?? null,
        passed_stage: null,
      }
    })

    res.json({
      has_any_accounts: accounts.length > 0,
      has_active_accounts: mapped.some((account) => account.is_active),
      active_accounts: mapped.filter((account) => account.is_active),
      history_accounts: mapped.filter((account) => !account.is_active),
    })
  } catch (err) {
    next(err as Error)
  }
}

export const getChallengeAccountDetail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = ensureUser(req)
    const challengeId = String(req.params.challengeId ?? '').trim()
    if (!challengeId) {
      throw new ApiError('Challenge ID is required', 400)
    }

    type CTraderAccountWithMetrics = CTraderAccount & { metrics: CTraderAccountMetric | null }
    const account: CTraderAccountWithMetrics | null = await prisma.cTraderAccount.findFirst({
      where: { userId: user.id, challengeId },
      include: { metrics: true },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    type MetricsSnapshot = Pick<
      CTraderAccountMetric,
      | 'balance'
      | 'equity'
      | 'unrealizedPnl'
      | 'maxPermittedLossLeft'
      | 'highestBalance'
      | 'breachBalance'
      | 'profitTargetBalance'
      | 'winRate'
      | 'closedTradesCount'
      | 'winningTradesCount'
      | 'lotsTradedTotal'
      | 'todayClosedPnl'
      | 'todayTradesCount'
      | 'todayLotsTotal'
      | 'minTradingDaysRequired'
      | 'minTradingDaysMet'
      | 'stageElapsedHours'
      | 'scalpingViolationsCount'
      | 'capturedAt'
    >

    const metrics: MetricsSnapshot = account.metrics ?? {
      balance: 0,
      equity: 0,
      unrealizedPnl: 0,
      maxPermittedLossLeft: 0,
      highestBalance: 0,
      breachBalance: 0,
      profitTargetBalance: 0,
      winRate: 0,
      closedTradesCount: 0,
      winningTradesCount: 0,
      lotsTradedTotal: 0,
      todayClosedPnl: 0,
      todayTradesCount: 0,
      todayLotsTotal: 0,
      minTradingDaysRequired: 0,
      minTradingDaysMet: false,
      stageElapsedHours: 0,
      scalpingViolationsCount: 0,
      capturedAt: new Date(),
    }

    res.json({
      challenge_id: account.challengeId,
      account_size: account.accountSize,
      phase: account.phase,
      objective_status: account.status.toLowerCase(),
      breached_reason: null,
      started_at: account.startedAt?.toISOString() ?? null,
      breached_at: account.breachedAt?.toISOString() ?? null,
      passed_at: account.passedAt?.toISOString() ?? null,
      mt5_account: account.accountNumber,
      last_feed_at: account.metrics?.capturedAt?.toISOString() ?? null,
      last_refresh_requested_at: null,
      metrics: {
        balance: metrics.balance,
        equity: metrics.equity,
        unrealized_pnl: metrics.unrealizedPnl,
        max_permitted_loss_left: metrics.maxPermittedLossLeft,
        highest_balance: metrics.highestBalance,
        breach_balance: metrics.breachBalance,
        profit_target_balance: metrics.profitTargetBalance,
        win_rate: metrics.winRate,
        closed_trades_count: metrics.closedTradesCount,
        winning_trades_count: metrics.winningTradesCount,
        lots_traded_total: metrics.lotsTradedTotal,
        today_closed_pnl: metrics.todayClosedPnl,
        today_trades_count: metrics.todayTradesCount,
        today_lots_total: metrics.todayLotsTotal,
        min_trading_days_required: metrics.minTradingDaysRequired,
        min_trading_days_met: metrics.minTradingDaysMet,
        stage_elapsed_hours: metrics.stageElapsedHours,
        scalping_violations_count: metrics.scalpingViolationsCount,
      },
      objectives: {},
      credentials: {
        server: account.brokerName,
        account_number: account.accountNumber,
        password: 'Contact support',
        investor_password: 'Contact support',
      },
      funded_profit_raw: null,
      funded_profit_capped: null,
      funded_profit_cap_amount: null,
      funded_user_payout_amount: null,
    })
  } catch (err) {
    next(err as Error)
  }
}