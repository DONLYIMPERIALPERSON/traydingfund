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
import { buildCacheKey, getCached, setCached, clearCacheByPrefix } from '../../common/cache'
import { recordCredentialView } from '../../services/emailLog.service'
import { pushActiveAccountAdd } from '../../services/ctraderEngine.service'
import { buildBreachNarrative, generateBreachReportPdfBuffer, getOrCreateBreachReport, writeBreachReportPreview, type BreachReportPayload } from '../../services/breachReport.service'

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
  if (normalized === 'withdrawn') return 'Withdrawn'
  if (normalized === 'awaiting_reset') return 'Awaiting Reset'
  if (normalized === 'withdraw_requested') return 'Withdrawal Requested'
  if (normalized === 'admin_checking') return 'Admin Checking'
  if (normalized === 'assigned_pending_access') return 'Active'
  if (normalized === 'assigned') return 'Assigned'
  if (normalized === 'ready') return 'Ready'
  return status
}

const isActiveStatus = (status: string) => {
  const normalized = status.toLowerCase()
  return normalized === 'active'
    || normalized === 'assigned'
    || normalized === 'funded'
    || normalized === 'assigned_pending_access'
    || normalized === 'awaiting_reset'
    || normalized === 'admin_checking'
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

type ChallengeScope = 'trader' | 'attic'

const resolveChallengeScope = (req: Request): ChallengeScope => {
  const raw = String(req.query.scope ?? '').toLowerCase()
  return raw === 'attic' ? 'attic' : 'trader'
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

const formatCompactDate = (value?: Date | string | number | null) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatCompactTime = (value?: Date | string | number | null) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  return parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const formatTitleCase = (value?: string | null) => String(value ?? '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase())

const percentLabel = (used: number, total: number) => {
  if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) return null
  return `${Math.max(0, (used / total) * 100).toFixed(2)}% used`
}

const readNumeric = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

const buildBreachReportPayload = (args: {
  account: CTraderAccount & { metrics: CTraderAccountMetric | null }
  userEmail: string
  userName: string
  currency: string
}) : BreachReportPayload => {
  const { account, userEmail, userName, currency } = args
  const metrics = account.metrics
  const breachReason = String(metrics?.breachReason ?? 'UNKNOWN')
  const { title, narrative } = buildBreachNarrative(breachReason)
  const breachEvent = (metrics?.breachEvent as Record<string, unknown> | null) ?? null
  const breachTime = (() => {
    const eventTimeMs = breachEvent?.time_ms ?? breachEvent?.closed_time_ms ?? breachEvent?.timestamp_ms
    if (typeof eventTimeMs === 'number') return new Date(eventTimeMs)
    if (typeof eventTimeMs === 'string' && Number.isFinite(Number(eventTimeMs))) return new Date(Number(eventTimeMs))
    return account.breachedAt ?? account.updatedAt
  })()
  const peak = metrics?.highestBalance ?? account.initialBalance ?? 0
  const equityAtBreach = metrics?.minEquity ?? metrics?.dailyLowEquity ?? metrics?.equity ?? metrics?.balance ?? account.initialBalance ?? 0
  const balanceBeforeTrade = (() => {
    const eventBalance = readNumeric(
      breachEvent?.balance_before_trade,
      breachEvent?.balance_before_breach,
      breachEvent?.balance_before,
      breachEvent?.balance_at_open,
      breachEvent?.balance_at_breach,
      breachEvent?.balance,
    )

    if (eventBalance != null) return eventBalance
    if (breachReason === 'DAILY_DRAWDOWN') {
      return readNumeric(metrics?.dailyHighBalance, account.initialBalance, metrics?.balance) ?? 0
    }
    if (breachReason === 'MAX_DRAWDOWN') {
      return readNumeric(metrics?.highestBalance, account.initialBalance, metrics?.balance) ?? 0
    }
    return readNumeric(account.initialBalance, metrics?.balance) ?? 0
  })()
  const dailyLimitValue = metrics?.dailyBreachBalance ?? null
  const maxLimitValue = metrics?.breachBalance ?? null
  const maxLossUsed = Math.max(0, peak - equityAtBreach)
  const maxLossLimit = maxLimitValue != null ? Math.max(0, peak - maxLimitValue) : 0
  const dailyLossUsed = Math.max(0, (metrics?.dailyHighBalance ?? peak) - equityAtBreach)
  const dailyLossLimit = dailyLimitValue != null ? Math.max(0, (metrics?.dailyHighBalance ?? peak) - dailyLimitValue) : 0
  const openPositionsAtBreach = Array.isArray((breachEvent as any)?.open_positions_at_breach)
    ? ((breachEvent as any).open_positions_at_breach as Array<Record<string, unknown>>)
    : []

  return {
    accountNumber: account.accountNumber,
    challengeId: account.challengeId,
    traderName: userName,
    traderEmail: userEmail,
    accountSize: account.accountSize,
    phase: formatTitleCase(account.phase),
    challengeType: formatTitleCase(account.challengeType),
    platform: String(account.platform ?? 'ctrader'),
    currency,
    status: formatTitleCase(account.status),
    generatedAt: new Date(),
    breachReason,
    breachReasonLabel: title,
    breachNarrative: narrative,
    breachTimeLabel: formatCompactDate(breachTime),
    peakBalance: formatCurrency(peak, currency),
    balanceBeforeTrade: formatCurrency(balanceBeforeTrade, currency),
    equityAtBreach: formatCurrency(equityAtBreach, currency),
    dailyLimit: dailyLimitValue != null ? formatCurrency(dailyLimitValue, currency) : null,
    maxLimit: maxLimitValue != null ? formatCurrency(maxLimitValue, currency) : null,
    dailyDrawdownUsageLabel: dailyLimitValue != null ? percentLabel(dailyLossUsed, dailyLossLimit) : null,
    maxDrawdownUsageLabel: maxLimitValue != null ? percentLabel(maxLossUsed, maxLossLimit) : null,
    breachDetails: [
      { label: 'Reason', value: breachReason },
      { label: 'Breach Time', value: `${formatCompactDate(breachTime)} ${formatCompactTime(breachTime)}` },
      { label: 'Peak Balance', value: formatCurrency(peak, currency) },
      { label: 'Equity Low', value: formatCurrency(equityAtBreach, currency) },
    ],
    openPositions: openPositionsAtBreach.slice(0, 6).map((position) => ({
      symbol: String(position.symbol ?? '-'),
      ticket: String(position.ticket ?? position.position_id ?? '-'),
      floatingPnl: formatCurrency(Number(position.floating_pnl ?? 0), currency),
      time: formatCompactTime(typeof position.open_time_ms === 'number' ? position.open_time_ms : breachTime),
    })),
    analysisParagraph: `Your account started from a protected balance profile and the system tracked equity, balance, and drawdown continuously. At the breach point, equity reached ${formatCurrency(equityAtBreach, currency)}, which triggered the ${title.toLowerCase()} condition according to your account rules.`,
    guidance: [
      'Always use stop-loss to control downside risk.',
      'Avoid stacking multiple correlated or high-risk positions.',
      'Monitor equity, not just balance, during open trades.',
      'Reduce position size during volatile market conditions.',
    ],
  }
}

const computeAtticTimeLimitInfo = (args: {
  challengeType?: string | null
  objectiveStatus: string
  breachReason?: string | null
  passedAt?: Date | null
  tradingCycleStart?: Date | null
}) => {
  const normalizedChallengeType = String(args.challengeType ?? '').toLowerCase()
  if (normalizedChallengeType !== 'attic') {
    return {
      status: null,
      startAt: null,
      expiresAt: null,
      remainingHours: null,
      remainingMinutes: null,
    }
  }

  const startAt = args.tradingCycleStart ?? null
  if (!startAt) {
    return {
      status: 'not_started',
      startAt: null,
      expiresAt: null,
      remainingHours: null,
      remainingMinutes: null,
    }
  }

  const expiresAt = new Date(startAt.getTime() + (24 * 60 * 60 * 1000))
  const now = new Date()
  const remainingMs = expiresAt.getTime() - now.getTime()
  const remainingHours = remainingMs / (60 * 60 * 1000)
  const remainingMinutes = remainingMs / (60 * 1000)
  const normalizedStatus = String(args.objectiveStatus ?? '').toLowerCase()
  const normalizedBreachReason = String(args.breachReason ?? '').toUpperCase()

  const status = normalizedBreachReason === 'TIME_LIMIT' || normalizedStatus === 'breached'
    ? 'expired'
    : args.passedAt || normalizedStatus === 'awaiting_reset'
      ? 'passed'
      : remainingMs <= 0
        ? 'expired_pending_confirmation'
        : 'running'

  return {
    status,
    startAt: startAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    remainingHours,
    remainingMinutes,
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
    const cacheKey = buildCacheKey(['trader', 'me', user.id])
    const cached = await getCached<Record<string, unknown>>(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      throw new ApiError('User not found', 404)
    }

    const { firstName, lastName } = splitFullName(dbUser.fullName)

    const payload = {
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
      overall_reward_currency: dbUser.overallRewardCurrency ?? 'USD',
    }

    await setCached(cacheKey, payload, 30)
    res.json(payload)
  } catch (err) {
    next(err as Error)
  }
}

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { first_name, last_name, nick_name, use_nickname_for_certificates, overall_reward_currency } = req.body as {
      first_name?: string
      last_name?: string
      nick_name?: string | null
      use_nickname_for_certificates?: boolean
      overall_reward_currency?: string
    }

    if (!first_name
      && !last_name
      && typeof nick_name === 'undefined'
      && typeof use_nickname_for_certificates === 'undefined'
      && typeof overall_reward_currency === 'undefined') {
      throw new ApiError('first_name/last_name, nick_name, or use_nickname_for_certificates is required', 400)
    }

    if ((first_name && !last_name) || (!first_name && last_name)) {
      throw new ApiError('first_name and last_name are required together', 400)
    }

    const data: {
      fullName?: string
      nickName?: string | null
      useNicknameForCertificates?: boolean
      overallRewardCurrency?: string
    } = {}
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
    if (typeof overall_reward_currency !== 'undefined') {
      data.overallRewardCurrency = overall_reward_currency.toUpperCase()
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    })

    const { firstName, lastName } = splitFullName(updated.fullName)

    const payload = {
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
      overall_reward_currency: updated.overallRewardCurrency ?? 'USD',
    }

    await clearCacheByPrefix(buildCacheKey(['trader', 'me', user.id]))
    res.json(payload)
  } catch (err) {
    next(err as Error)
  }
}

export const listChallengeAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const scope = resolveChallengeScope(req)
    const cacheKey = buildCacheKey(['trader', 'challenges', user.id, scope])
    const cached = await getCached<Record<string, unknown>>(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }
    const accounts: (CTraderAccount & {
      payouts: { status: string }[]
      metrics?: CTraderAccountMetric | null
      adjustments: { reason: string | null; createdAt: Date }[]
    })[] = await prisma.cTraderAccount.findMany({
      where: {
        userId: user.id,
        ...(scope === 'attic'
          ? { challengeType: 'attic' }
          : { NOT: { challengeType: 'attic' } }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        metrics: true,
        adjustments: {
          where: { reason: { in: ['phase_reset'] } },
          orderBy: { createdAt: 'desc' },
          select: { reason: true, createdAt: true },
        },
        payouts: {
          where: { status: { in: ['pending_approval', 'processing'] } },
          select: { status: true },
        },
      },
    })

    const mapped = accounts.map((account) => {
      const displayStatus = mapAccountStatus(account.status)
      const hasPendingWithdrawal = account.payouts?.length > 0
      const rawResetType = (account.metrics as { expectedBalanceOperationType?: string | null } | null)?.expectedBalanceOperationType
        ?? null
      const resetType = rawResetType === 'PHASE_RESET'
        ? 'RESET_NEXT_PHASE'
        : rawResetType === 'WITHDRAWAL'
          ? 'RESET_WITHDRAWAL'
          : rawResetType === 'MANUAL_ADJUSTMENT'
            ? 'RESET_MANUAL_ADJUSTMENT'
            : null
      const baseAccount = {
        challenge_id: account.challengeId,
        account_size: account.accountSize,
        currency: account.currency,
        challenge_type: normalizeChallengeType(account.challengeType),
        phase: account.phase,
        objective_status: account.status.toLowerCase(),
        display_status: displayStatus,
        is_active: isActiveStatus(account.status),
        mt5_account: account.accountNumber,
        platform: account.platform ?? 'ctrader',
        has_pending_withdrawal: hasPendingWithdrawal,
        reset_type: resetType,
        started_at: account.startedAt?.toISOString() ?? null,
        breached_at: account.breachedAt?.toISOString() ?? null,
        passed_at: account.passedAt?.toISOString() ?? null,
        passed_stage: null,
      }

      return baseAccount
    })

    const payload = {
      has_any_accounts: accounts.length > 0,
      has_active_accounts: mapped.some((account) => account.is_active),
      active_accounts: mapped.filter((account) => account.is_active),
      history_accounts: mapped.filter((account) => !account.is_active),
    }

    await setCached(cacheKey, payload, 30)
    res.json(payload)
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
    const scope = resolveChallengeScope(req)
    const challengeId = String(req.params.challengeId ?? '').trim()
    if (!challengeId) {
      throw new ApiError('Challenge ID is required', 400)
    }

    type CTraderAccountWithMetrics = CTraderAccount & { metrics: CTraderAccountMetric | null }
    const account: (CTraderAccountWithMetrics & { payouts: { status: string; amountKobo: number }[] }) | null = await prisma.cTraderAccount.findFirst({
      where: {
        userId: user.id,
        challengeId,
        ...(scope === 'attic'
          ? { challengeType: 'attic' }
          : { NOT: { challengeType: 'attic' } }),
      },
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
      | 'dailyBreachBalance'
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
      | 'durationViolationsCount'
      | 'processedTradeIds'
      | 'dailyHighBalance'
      | 'dailyLowEquity'
      | 'drawdownPercent'
      | 'dailyDrawdownPercent'
      | 'tradingDaysCount'
      | 'tradingCycleStart'
      | 'tradingCycleSource'
      | 'capturedAt'
      | 'breachEvent'
      | 'tradeDurationViolations'
      | 'minEquity'
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
      dailyBreachBalance: baseBalance,
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
      durationViolationsCount: 0,
       processedTradeIds: [],
      dailyHighBalance: baseBalance,
      dailyLowEquity: null,
      drawdownPercent: null,
      dailyDrawdownPercent: null,
      tradingDaysCount: 0,
      tradingCycleStart: null,
      tradingCycleSource: null,
      breachEvent: null,
      tradeDurationViolations: null,
      minEquity: baseBalance,
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
    const maxDrawdownBalance = metrics.breachBalance ?? initialBalance
    const dailyDrawdownBalance = metrics.dailyBreachBalance ?? initialBalance
    const minTradeDurationMinutes = objectiveFields.minTradeDurationMinutes ?? 0
    const durationViolationsCount = metrics.durationViolationsCount ?? 0
    const minTradingDaysRequired = objectiveFields.minTradingDaysRequired ?? 0
    const stageElapsedHours = metrics.stageElapsedHours ?? 0
    const minTradingDaysMet = metrics.minTradingDaysMet || stageElapsedHours >= minTradingDaysRequired * 24
    const profitRemaining = Math.max(0, profitTargetBalance - metrics.balance)
    const maxDrawdownRemaining = metrics.breachBalance != null
      ? Math.max(0, (metrics.minEquity ?? metrics.equity) - maxDrawdownBalance)
      : 0
    const dailyDrawdownRemaining = metrics.dailyBreachBalance != null
      ? Math.max(0, (metrics.dailyLowEquity ?? metrics.equity) - dailyDrawdownBalance)
      : 0

    const platform = String(account.platform ?? 'ctrader').toLowerCase()
    const breachReason = (account.metrics as { breachReason?: string | null } | null)?.breachReason ?? null
    const normalizedBreachReason = breachReason?.toUpperCase() ?? null
    const breachedByMaxDrawdown = normalizedBreachReason === 'MAX_DRAWDOWN'
    const breachedByDailyDrawdown = normalizedBreachReason === 'DAILY_DRAWDOWN'
    const minTradeDurationBreached = normalizedBreachReason === 'MIN_TRADE_DURATION'
    const rawResetType = (account.metrics as { expectedBalanceOperationType?: string | null } | null)?.expectedBalanceOperationType
      ?? null
    const resetType = rawResetType === 'PHASE_RESET'
      ? 'RESET_NEXT_PHASE'
      : rawResetType === 'WITHDRAWAL'
        ? 'RESET_WITHDRAWAL'
        : rawResetType === 'MANUAL_ADJUSTMENT'
          ? 'RESET_MANUAL_ADJUSTMENT'
          : null

    const isMt5Account = platform === 'mt5'

    const objectives = {
      profit_target: {
        label: 'Profit Target',
        status: metrics.balance >= profitTargetBalance ? 'passed' : 'pending',
        note: profitTargetBalance
          ? `${formatAccountCurrency(profitRemaining)} left`
          : 'Pending',
      },
      max_drawdown: {
        label: 'Max Drawdown',
        status: breachedByMaxDrawdown
          ? 'breached'
          : isMt5Account
            ? (metrics.breachBalance != null ? 'passed' : 'pending')
            : metrics.breachBalance != null
            ? ((metrics.minEquity ?? metrics.equity) < maxDrawdownBalance ? 'breached' : 'passed')
            : 'pending',
        note: metrics.breachBalance != null
          ? `${formatAccountCurrency(maxDrawdownRemaining)} loss remaining`
          : 'Pending',
      },
      ...(normalizedChallengeType === 'ngn_flexi' ? {} : {
        max_daily_drawdown: {
          label: 'Max Daily Drawdown',
          status: breachedByDailyDrawdown
            ? 'breached'
            : isMt5Account
              ? (metrics.dailyBreachBalance != null ? 'passed' : 'pending')
              : metrics.dailyBreachBalance != null
              ? ((metrics.dailyLowEquity ?? metrics.equity) < dailyDrawdownBalance ? 'breached' : 'passed')
              : 'pending',
          note: metrics.dailyBreachBalance != null
            ? `${formatAccountCurrency(dailyDrawdownRemaining)} loss remaining`
            : 'Pending',
        },
      }),
      min_trade_duration: {
        label: 'Minimum Trade Duration',
        status: durationViolationsCount >= 3 || minTradeDurationBreached ? 'breached' : 'passed',
        note: minTradeDurationMinutes
          ? `${durationViolationsCount >= 3 || minTradeDurationBreached ? 'Violated' : 'Pass'} • ${minTradeDurationMinutes} min rule (${durationViolationsCount}/3)`
          : 'Pending',
      },
      min_trading_days: {
        label: 'Minimum Trading Days',
        status: minTradingDaysMet ? 'passed' : 'pending',
        note: `${stageElapsedHours.toFixed(2)}h / ${(minTradingDaysRequired * 24).toFixed(2)}h`,
      },
    }

    const pendingPayout = account.payouts?.[0] ?? null
    const existingBreachReport = String(account.status).toLowerCase() === 'breached'
      ? await prisma.certificate.findFirst({
          where: {
            userId: user.id,
            type: 'breach_report',
            relatedEntityId: account.challengeId,
          },
        })
      : null
    const atticTimeLimit = computeAtticTimeLimitInfo({
      challengeType: account.challengeType,
      objectiveStatus: account.status,
      breachReason,
      passedAt: account.passedAt,
      tradingCycleStart: metrics.tradingCycleStart ?? null,
    })
    const credentials = platform === 'mt5'
      ? {
        server: account.mt5Server ?? account.brokerName,
        account_number: account.mt5Login ?? account.accountNumber,
        password: account.mt5Password ?? 'Contact support',
        investor_password: null,
      }
      : {
        server: account.brokerName,
        account_number: account.accountNumber,
        password: 'Contact support',
        investor_password: 'Contact support',
      }

    if (platform === 'mt5' && account.userId) {
      await recordCredentialView({
        accountId: account.id,
        userId: account.userId ?? null,
        metadata: {
          scope: 'trader',
          platform,
          action: 'view_credentials',
        },
      })
    }

    res.json({
      challenge_id: account.challengeId,
      account_size: account.accountSize,
      currency: account.currency,
      challenge_type: normalizedChallengeType,
      platform: account.platform ?? 'ctrader',
      initial_balance: resolvedInitialBalance,
      phase: account.phase,
      objective_status: account.status.toLowerCase(),
      has_pending_withdrawal: Boolean(pendingPayout),
      pending_withdrawal_amount: pendingPayout ? pendingPayout.amountKobo / 100 : null,
      breached_reason: breachReason,
      reset_type: resetType,
      started_at: account.startedAt?.toISOString() ?? null,
      breached_at: account.breachedAt?.toISOString() ?? null,
      passed_at: account.passedAt?.toISOString() ?? null,
      mt5_account: account.accountNumber,
      breach_report_url: existingBreachReport?.certificateUrl ?? null,
      last_feed_at: account.metrics?.capturedAt?.toISOString() ?? null,
      last_refresh_requested_at: (account as { lastRefreshRequestedAt?: Date | null }).lastRefreshRequestedAt?.toISOString() ?? null,
      metrics: {
        balance: metrics.balance,
        equity: metrics.equity,
        unrealized_pnl: metrics.unrealizedPnl,
        max_permitted_loss_left: metrics.maxPermittedLossLeft,
        highest_balance: metrics.highestBalance,
        breach_balance: metrics.breachBalance,
        max_dd_amount: objectiveFields.maxDdAmount ?? null,
        daily_breach_balance: (account.metrics as { dailyBreachBalance?: number | null } | null)?.dailyBreachBalance
          ?? dailyDrawdownBalance,
        daily_peak_balance: metrics.dailyHighBalance
          ?? (account.metrics as { dailyHighBalance?: number | null } | null)?.dailyHighBalance
          ?? null,
        daily_dd_amount: objectiveFields.dailyDdAmount ?? null,
        min_equity: (account.metrics as { minEquity?: number | null } | null)?.minEquity ?? null,
        min_equity_note: (account.metrics as { minEquityNote?: string | null } | null)?.minEquityNote ?? null,
        equity_low: (account.metrics as { minEquity?: number | null } | null)?.minEquity ?? null,
        daily_low_equity: metrics.dailyLowEquity ?? null,
        drawdown_percent: metrics.drawdownPercent ?? null,
        daily_dd_percent: metrics.dailyDrawdownPercent ?? null,
        profit_target_balance: metrics.profitTargetBalance,
        profit_target_amount: objectiveFields.profitTargetAmount ?? null,
        win_rate: metrics.winRate,
        closed_trades_count: metrics.closedTradesCount,
        winning_trades_count: metrics.winningTradesCount,
        lots_traded_total: metrics.lotsTradedTotal,
        today_closed_pnl: metrics.todayClosedPnl,
        today_trades_count: metrics.todayTradesCount,
        today_lots_total: metrics.todayLotsTotal,
        min_trading_days_required: metrics.minTradingDaysRequired,
        min_trading_days_met: metrics.minTradingDaysMet,
        trading_days_count: metrics.tradingDaysCount ?? null,
        trading_cycle_start: metrics.tradingCycleStart?.toISOString() ?? null,
        trading_cycle_source: metrics.tradingCycleSource ?? null,
        stage_elapsed_hours: metrics.stageElapsedHours,
        time_limit_status: atticTimeLimit.status,
        time_limit_start_at: atticTimeLimit.startAt,
        time_limit_expires_at: atticTimeLimit.expiresAt,
        time_limit_remaining_hours: atticTimeLimit.remainingHours,
        time_limit_remaining_minutes: atticTimeLimit.remainingMinutes,
        scalping_violations_count: metrics.scalpingViolationsCount,
        duration_violations_count: durationViolationsCount,
        processed_trade_ids: Array.isArray((account.metrics as any)?.processedTradeIds)
          ? (account.metrics as any).processedTradeIds
          : metrics.processedTradeIds ?? [],
        breach_event: (metrics as { breachEvent?: unknown }).breachEvent ?? null,
        trade_duration_violations: (metrics as { tradeDurationViolations?: unknown }).tradeDurationViolations ?? null,
        reset_type: resetType,
      },
      objectives,
      credentials,
      funded_profit_raw: null,
      funded_profit_capped: null,
      funded_profit_cap_amount: null,
      funded_user_payout_amount: null,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const getChallengeCalendar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = ensureUser(req)
    const scope = resolveChallengeScope(req)
    const challengeId = String(req.params.challengeId ?? '').trim()
    if (!challengeId) {
      throw new ApiError('Challenge ID is required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: {
        userId: user.id,
        challengeId,
        ...(scope === 'attic'
          ? { challengeType: 'attic' }
          : { NOT: { challengeType: 'attic' } }),
      },
      include: {
        dailyPnl: {
          orderBy: { date: 'asc' },
        },
      },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    res.json({
      challenge_id: account.challengeId,
      account_number: account.accountNumber,
      account_size: account.accountSize,
      currency: account.currency,
      phase: account.phase,
      challenge_type: normalizeChallengeType(account.challengeType),
      daily_pnl: account.dailyPnl.map((entry) => ({
        date: entry.date.toISOString().slice(0, 10),
        pnl: entry.pnl,
      })),
    })
  } catch (err) {
    next(err as Error)
  }
}

export const requestChallengeRefresh = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const scope = resolveChallengeScope(req)
    const { challenge_id } = req.body as { challenge_id?: string }
    if (!challenge_id) {
      throw new ApiError('challenge_id is required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: {
        userId: user.id,
        challengeId: challenge_id,
        ...(scope === 'attic'
          ? { challengeType: 'attic' }
          : { NOT: { challengeType: 'attic' } }),
      },
      include: { user: true },
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
      await pushActiveAccountAdd({
        accountNumber: account.accountNumber,
        phase: account.phase,
        status: account.status,
        challengeType: account.challengeType,
      })
    } catch (error) {
      console.error('Failed to push active account for trader refresh', error)
    }

    res.json({ status: 'refresh_requested', requested_at: now.toISOString() })
  } catch (err) {
    next(err as Error)
  }
}

export const downloadBreachReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const challengeId = String(req.params.challengeId ?? '').trim()
    if (!challengeId) throw new ApiError('Challenge ID is required', 400)

    const account = await prisma.cTraderAccount.findFirst({
      where: { userId: user.id, challengeId },
      include: { metrics: true },
    })
    if (!account) throw new ApiError('Account not found', 404)
    if (String(account.status).toLowerCase() !== 'breached') {
      throw new ApiError('Breach report is only available for breached accounts', 400)
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    const payload = buildBreachReportPayload({
      account,
      userEmail: dbUser?.email ?? user.email,
      userName: dbUser?.fullName?.trim() || dbUser?.nickName?.trim() || user.email,
      currency: account.currency ?? 'USD',
    })
    const reportRecord = await getOrCreateBreachReport({
      userId: user.id,
      accountId: account.id,
      challengeId: account.challengeId,
      report: payload,
    })

    res.json({
      download_url: reportRecord.certificateUrl,
      filename: `breach-report-${account.accountNumber}.pdf`,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const generateBreachReportPreviews = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const generatedAt = new Date('2026-04-21T00:00:00Z')
    const samples: Array<[string, BreachReportPayload]> = [
      ['breach-report-daily-dd.pdf', {
        accountNumber: '435279648',
        challengeId: 'CH-9001-funded',
        traderName: 'Petruse Felator',
        traderEmail: 'khpvc02@gmail.com',
        accountSize: '$2,000',
        phase: 'Funded',
        challengeType: 'Two Step',
        platform: 'mt5',
        currency: 'USD',
        status: 'Breached',
        generatedAt,
        breachReason: 'DAILY_DRAWDOWN',
        breachReasonLabel: 'Daily Drawdown Breach',
        breachNarrative: 'Your account exceeded the allowed daily loss limit. Once your equity dropped below the threshold, the system automatically marked the account as breached.',
        breachTimeLabel: '21 Apr 2026',
        peakBalance: '$2,000.00',
        balanceBeforeTrade: '$1,938.09',
        equityAtBreach: '$1,899.83',
        dailyLimit: '$1,900.00',
        maxLimit: '$1,780.00',
        dailyDrawdownUsageLabel: '100.17% used',
        maxDrawdownUsageLabel: '45.53% used',
        breachDetails: [],
        openPositions: [
          { symbol: 'BTCUSDm', ticket: '2624286108', floatingPnl: '-$19.30', time: '21:45' },
          { symbol: 'BTCUSDm', ticket: '2624286246', floatingPnl: '-$18.96', time: '21:45' },
        ],
        analysisParagraph: 'Your account started at a balance of $1,938.09. As your position moved into loss, your equity dropped due to floating drawdown. The allowed daily limit was $1,900.00. When your equity reached $1,899.83, it crossed the threshold and triggered a breach.',
        guidance: ['Always use stop-loss to control downside risk', 'Avoid stacking multiple high-risk positions', 'Monitor equity, not just balance', 'Reduce lot size during volatile market conditions'],
      }],
      ['breach-report-max-dd.pdf', {
        accountNumber: '435406663',
        challengeId: 'CH-9012-ph2',
        traderName: 'Ada Trader',
        traderEmail: 'ada@example.com',
        accountSize: '₦200,000',
        phase: 'Phase 2',
        challengeType: 'NGN Standard',
        platform: 'mt5',
        currency: 'NGN',
        status: 'Breached',
        generatedAt,
        breachReason: 'MAX_DRAWDOWN',
        breachReasonLabel: 'Maximum Drawdown Breach',
        breachNarrative: 'Your account equity fell below the overall drawdown protection level calculated from your peak balance. The breach was permanent once that line was crossed.',
        breachTimeLabel: '21 Apr 2026',
        peakBalance: '₦240,000.00',
        balanceBeforeTrade: '₦205,000.00',
        equityAtBreach: '₦178,500.00',
        dailyLimit: '₦193,000.00',
        maxLimit: '₦178,600.00',
        dailyDrawdownUsageLabel: '84.12% used',
        maxDrawdownUsageLabel: '100.12% used',
        breachDetails: [],
        openPositions: [
          { symbol: 'XAUUSDm', ticket: '9981272', floatingPnl: '-₦14,500.00', time: '13:22' },
        ],
        analysisParagraph: 'The account reached a strong peak first, but subsequent open losses reduced equity below the maximum drawdown floor. Once equity dropped to ₦178,500.00, the system registered a maximum drawdown breach.',
        guidance: ['Lock profits after strong runs', 'Reduce size after peak-equity expansion', 'Avoid holding oversized losses', 'Review overall account exposure continuously'],
      }],
      ['breach-report-duration.pdf', {
        accountNumber: '435366798',
        challengeId: 'CH-9020',
        traderName: 'Lucky Chi',
        traderEmail: 'lucky@example.com',
        accountSize: '$10,000',
        phase: 'Phase 1',
        challengeType: 'Two Step',
        platform: 'mt5',
        currency: 'USD',
        status: 'Breached',
        generatedAt,
        breachReason: 'MIN_TRADE_DURATION',
        breachReasonLabel: 'Minimum Trade Duration Breach',
        breachNarrative: 'The account breached the minimum trade duration rule after multiple trades were closed too quickly. This triggered the automated violation threshold.',
        breachTimeLabel: '21 Apr 2026',
        peakBalance: '$10,080.00',
        balanceBeforeTrade: '$10,012.00',
        equityAtBreach: '$9,988.00',
        dailyLimit: '$9,500.00',
        maxLimit: '$8,900.00',
        dailyDrawdownUsageLabel: '9.20% used',
        maxDrawdownUsageLabel: '1.01% used',
        breachDetails: [],
        openPositions: [],
        analysisParagraph: 'The account did not breach by drawdown; instead, repeated short-duration trades broke the minimum hold-time rule. This kind of breach is behavior-based rather than equity-based.',
        guidance: ['Let trades develop before closing', 'Avoid ultra-short scalping patterns', 'Track hold time per trade', 'Review strategy execution discipline'],
      }],
    ]

    const outputs = await Promise.all(samples.map(([filename, payload]) => writeBreachReportPreview(filename, payload)))
    res.json({ output_paths: outputs })
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
    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 10)
    const certificates = await listUserCertificates(user.id)
    const total = certificates.length
    const pages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit
    const end = start + limit

    res.json({
      certificates: certificates.slice(start, end),
      pagination: { page, limit, total, pages },
    })
  } catch (err) {
    next(err as Error)
  }
}