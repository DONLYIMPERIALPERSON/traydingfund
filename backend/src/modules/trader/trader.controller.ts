import { Request, Response, NextFunction } from 'express'
import type { CTraderAccount, CTraderAccountMetric } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { buildObjectiveFields } from '../ctrader/ctrader.objectives'
import {
  generateRewardCertificateTest,
  generateOnboardingCertificateTest,
  generatePassedChallengeCertificateTest,
} from '../../services/rewardCertificate.service'
import { listUserCertificates } from '../../services/certificate.service'
import { requestAccountAccess } from '../../services/accessEngine.service'

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
  if (normalized === 'assigned_pending_access') return 'Active'
  if (normalized === 'assigned') return 'Assigned'
  if (normalized === 'ready') return 'Ready'
  return status
}

const isActiveStatus = (status: string) => {
  const normalized = status.toLowerCase()
  return normalized === 'active' || normalized === 'assigned' || normalized === 'funded' || normalized === 'assigned_pending_access'
}

const normalizeChallengeType = (value?: string | null) => {
  if (!value) return 'two_step'
  const normalized = value.toLowerCase().replace(/-/g, '_')
  if (['two_step', 'one_step', 'instant_funded', 'ngn_standard', 'ngn_flexi'].includes(normalized)) {
    return normalized
  }
  if (['challenge', 'funded', 'assigned_pending_access'].includes(normalized)) {
    return 'two_step'
  }
  return normalized
}

const formatCurrency = (value: number, currency: string) => {
  const normalized = currency.toUpperCase()
  try {
    if (normalized === 'NGN') {
      return `₦${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalized,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

const splitFullName = (fullName?: string | null) => {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: null, lastName: null }
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null }
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      throw new ApiError('User not found', 404)
    }

    const { firstName, lastName } = splitFullName(dbUser.fullName)

    res.json({
      id: dbUser.id,
      descope_user_id: null,
      email: dbUser.email,
      full_name: dbUser.fullName,
      first_name: firstName,
      last_name: lastName,
      nick_name: dbUser.nickName,
      role: dbUser.role,
      status: dbUser.status,
      kyc_status: dbUser.kycStatus,
      payout_method_type: dbUser.payoutMethodType,
      payout_bank_name: dbUser.payoutBankName,
      payout_bank_code: dbUser.payoutBankCode,
      payout_account_number: dbUser.payoutAccountNumber,
      payout_account_name: dbUser.payoutAccountName,
      payout_crypto_currency: dbUser.payoutCryptoCurrency,
      payout_crypto_address: dbUser.payoutCryptoAddress,
      payout_crypto_first_name: dbUser.payoutCryptoFirstName,
      payout_crypto_last_name: dbUser.payoutCryptoLastName,
      payout_verified_at: dbUser.payoutVerifiedAt,
      use_nickname_for_certificates: (dbUser as { useNicknameForCertificates?: boolean }).useNicknameForCertificates ?? false,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { first_name, last_name, nick_name, use_nickname_for_certificates } = req.body as {
      first_name?: string
      last_name?: string
      nick_name?: string | null
      use_nickname_for_certificates?: boolean
    }

    if (!first_name && !last_name && typeof nick_name === 'undefined' && typeof use_nickname_for_certificates === 'undefined') {
      throw new ApiError('first_name/last_name, nick_name, or use_nickname_for_certificates is required', 400)
    }

    if ((first_name && !last_name) || (!first_name && last_name)) {
      throw new ApiError('first_name and last_name are required together', 400)
    }

    const data: { fullName?: string; nickName?: string | null; useNicknameForCertificates?: boolean } = {}
    if (first_name && last_name) {
      data.fullName = `${first_name.trim()} ${last_name.trim()}`.trim()
    }
    if (typeof nick_name !== 'undefined') {
      const trimmed = nick_name?.trim()
      data.nickName = trimmed ? trimmed : null
    }
    if (typeof use_nickname_for_certificates !== 'undefined') {
      data.useNicknameForCertificates = Boolean(use_nickname_for_certificates)
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    })

    const { firstName, lastName } = splitFullName(updated.fullName)

    res.json({
      id: updated.id,
      descope_user_id: null,
      email: updated.email,
      full_name: updated.fullName,
      first_name: firstName,
      last_name: lastName,
      nick_name: updated.nickName,
      role: updated.role,
      status: updated.status,
      kyc_status: updated.kycStatus,
      payout_method_type: updated.payoutMethodType,
      payout_bank_name: updated.payoutBankName,
      payout_bank_code: updated.payoutBankCode,
      payout_account_number: updated.payoutAccountNumber,
      payout_account_name: updated.payoutAccountName,
      payout_crypto_currency: updated.payoutCryptoCurrency,
      payout_crypto_address: updated.payoutCryptoAddress,
      payout_crypto_first_name: updated.payoutCryptoFirstName,
      payout_crypto_last_name: updated.payoutCryptoLastName,
      payout_verified_at: updated.payoutVerifiedAt,
      use_nickname_for_certificates: (updated as { useNicknameForCertificates?: boolean }).useNicknameForCertificates ?? false,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listChallengeAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const accounts: (CTraderAccount & { payouts: { status: string }[] })[] = await prisma.cTraderAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        payouts: {
          where: { status: { in: ['pending_approval', 'processing'] } },
          select: { status: true },
        },
      },
    })

    const mapped = accounts.map((account) => {
      const displayStatus = mapAccountStatus(account.status)
      const hasPendingWithdrawal = account.payouts?.length > 0
      return {
        challenge_id: account.challengeId,
        account_size: account.accountSize,
        currency: account.currency,
        challenge_type: normalizeChallengeType(account.challengeType),
        phase: account.phase,
        objective_status: account.status.toLowerCase(),
        display_status: displayStatus,
        is_active: isActiveStatus(account.status),
        mt5_account: account.accountNumber,
        has_pending_withdrawal: hasPendingWithdrawal,
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
    const account: (CTraderAccountWithMetrics & { payouts: { status: string; amountKobo: number }[] }) | null = await prisma.cTraderAccount.findFirst({
      where: { userId: user.id, challengeId },
      include: {
        metrics: true,
        payouts: {
          where: { status: { in: ['pending_approval', 'processing'] } },
          orderBy: { requestedAt: 'desc' },
          take: 1,
          select: { status: true, amountKobo: true },
        },
      },
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

    const objectiveFields = await buildObjectiveFields({
      accountSize: account.accountSize,
      challengeType: account.challengeType ?? 'two_step',
      phase: account.phase,
    })

    const baseBalance = account.initialBalance ?? objectiveFields.initialBalance ?? 0
    const metrics: MetricsSnapshot = account.metrics ?? {
      balance: baseBalance,
      equity: baseBalance,
      unrealizedPnl: 0,
      maxPermittedLossLeft: baseBalance,
      highestBalance: baseBalance,
      breachBalance: baseBalance,
      profitTargetBalance: baseBalance,
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

    const initialBalance = objectiveFields.initialBalance ?? metrics.balance
    const resolvedInitialBalance = account.initialBalance ?? initialBalance
    const normalizedChallengeType = normalizeChallengeType(account.challengeType)
    const accountCurrency = account.currency ?? 'USD'
    const formatAccountCurrency = (value: number) => formatCurrency(value, accountCurrency)
    const profitTargetBalance = objectiveFields.profitTargetAmount != null
      ? initialBalance + objectiveFields.profitTargetAmount
      : metrics.profitTargetBalance
    const maxDrawdownBalance = objectiveFields.maxDdAmount != null
      ? (metrics.highestBalance ?? initialBalance) - objectiveFields.maxDdAmount
      : metrics.breachBalance
    const dailyDrawdownBalance = objectiveFields.dailyDdAmount != null
      ? (metrics.highestBalance ?? initialBalance) - objectiveFields.dailyDdAmount
      : metrics.breachBalance
    const minTradeDurationMinutes = objectiveFields.minTradeDurationMinutes ?? 0
    const minTradingDaysRequired = objectiveFields.minTradingDaysRequired ?? 0
    const stageElapsedHours = metrics.stageElapsedHours ?? 0
    const minTradingDaysMet = metrics.minTradingDaysMet || stageElapsedHours >= minTradingDaysRequired * 24
    const profitRemaining = Math.max(0, profitTargetBalance - metrics.equity)
    const maxDrawdownRemaining = Math.max(0, metrics.equity - maxDrawdownBalance)
    const dailyDrawdownRemaining = Math.max(0, metrics.equity - dailyDrawdownBalance)

    const objectives = {
      profit_target: {
        label: 'Profit Target',
        status: metrics.equity >= profitTargetBalance ? 'passed' : 'pending',
        note: profitTargetBalance
          ? `${formatAccountCurrency(profitRemaining)} left`
          : 'Pending',
      },
      max_drawdown: {
        label: 'Max Drawdown',
        status: metrics.equity < maxDrawdownBalance ? 'breached' : 'passed',
        note: maxDrawdownBalance
          ? `${formatAccountCurrency(maxDrawdownRemaining)} loss remaining`
          : 'Pending',
      },
      ...(normalizedChallengeType === 'ngn_flexi' ? {} : {
        max_daily_drawdown: {
          label: 'Max Daily Drawdown',
          status: metrics.equity < dailyDrawdownBalance ? 'breached' : 'passed',
          note: dailyDrawdownBalance
            ? `${formatAccountCurrency(dailyDrawdownRemaining)} loss remaining`
            : 'Pending',
        },
      }),
      min_trade_duration: {
        label: 'Minimum Trade Duration',
        status: metrics.scalpingViolationsCount > 0 ? 'breached' : 'passed',
        note: minTradeDurationMinutes
          ? `${metrics.scalpingViolationsCount > 0 ? 'Violated' : 'Pass'} • ${minTradeDurationMinutes} min rule`
          : 'Pending',
      },
      min_trading_days: {
        label: 'Minimum Trading Days',
        status: minTradingDaysMet ? 'passed' : 'pending',
        note: `${stageElapsedHours.toFixed(2)}h / ${(minTradingDaysRequired * 24).toFixed(2)}h`,
      },
    }

    const pendingPayout = account.payouts?.[0] ?? null

    res.json({
      challenge_id: account.challengeId,
      account_size: account.accountSize,
      currency: account.currency,
      challenge_type: normalizedChallengeType,
      initial_balance: resolvedInitialBalance,
      phase: account.phase,
      objective_status: account.status.toLowerCase(),
      has_pending_withdrawal: Boolean(pendingPayout),
      pending_withdrawal_amount: pendingPayout ? pendingPayout.amountKobo / 100 : null,
      breached_reason: null,
      started_at: account.startedAt?.toISOString() ?? null,
      breached_at: account.breachedAt?.toISOString() ?? null,
      passed_at: account.passedAt?.toISOString() ?? null,
      mt5_account: account.accountNumber,
      last_feed_at: account.metrics?.capturedAt?.toISOString() ?? null,
      last_refresh_requested_at: (account as { lastRefreshRequestedAt?: Date | null }).lastRefreshRequestedAt?.toISOString() ?? null,
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
      objectives,
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

export const requestChallengeRefresh = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { challenge_id } = req.body as { challenge_id?: string }
    if (!challenge_id) {
      throw new ApiError('challenge_id is required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: { userId: user.id, challengeId: challenge_id },
    })
    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    const now = new Date()
    await prisma.cTraderAccount.update({
      where: { id: account.id },
      data: { lastRefreshRequestedAt: now } as unknown as Record<string, unknown>,
    })

    try {
      await requestAccountAccess({
        user_email: user.email,
        account_number: account.accountNumber,
        broker: account.brokerName,
        platform: 'ctrader',
      })
    } catch (error) {
      console.error('Failed to request account refresh', error)
    }

    res.json({ status: 'refresh_requested', requested_at: now.toISOString() })
  } catch (err) {
    next(err as Error)
  }
}

export const generateRewardCertificatePreview = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const outputPath = await generateRewardCertificateTest()
    res.json({ output_path: outputPath })
  } catch (err) {
    next(err as Error)
  }
}

export const generateOnboardingCertificatePreview = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const outputPath = await generateOnboardingCertificateTest()
    res.json({ output_path: outputPath })
  } catch (err) {
    next(err as Error)
  }
}

export const generatePassedChallengeCertificatePreview = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const outputPath = await generatePassedChallengeCertificateTest()
    res.json({ output_path: outputPath })
  } catch (err) {
    next(err as Error)
  }
}

export const listCertificates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const certificates = await listUserCertificates(user.id)
    res.json({ certificates })
  } catch (err) {
    next(err as Error)
  }
}