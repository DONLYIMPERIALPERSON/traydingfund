import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { getFxRatesConfig } from '../fxRates/fxRates.service'
import { buildBreachNarrative, getOrCreateBreachReport, type BreachReportPayload } from '../../services/breachReport.service'

export const getAdminMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = (req as any).user?.email as string | undefined
    if (!email) {
      throw new ApiError('Unauthorized', 401)
    }

    const allowlist = await prisma.adminAllowlist.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!allowlist || allowlist.status !== 'active') {
      throw new ApiError('Admin access denied', 403)
    }

    res.json({
      id: allowlist.id,
      descope_user_id: null,
      email: allowlist.email,
      full_name: allowlist.fullName,
      role: allowlist.role,
      status: allowlist.status,
      allowed_pages: allowlist.allowedPages,
      can_assign_mt5: allowlist.canAssignMt5,
    })
  } catch (err) {
    next(err as Error)
  }
}

const formatUsdCompact = (amountKobo: number) =>
  `$${(amountKobo / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const normalizeCurrency = (currency?: string | null) => (currency?.toUpperCase() === 'NGN' ? 'NGN' : 'USD')

const toUsdKobo = (amountKobo: number, currency?: string | null, rate?: number) => {
  const normalized = normalizeCurrency(currency)
  if (normalized === 'NGN') {
    const divider = rate && rate > 0 ? rate : 1300
    const amount = amountKobo / 100
    return Math.round((amount / divider) * 100)
  }
  return amountKobo
}

const formatCurrencyValue = (value: number, currency?: string | null) => {
  const normalized = String(currency ?? 'USD').toUpperCase() === 'NGN' ? 'NGN' : 'USD'
  if (normalized === 'NGN') {
    return `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
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

const buildAdminBreachReportPayload = (account: any): BreachReportPayload => {
  const metrics = account.metrics
  const breachReason = String(metrics?.breachReason ?? 'UNKNOWN')
  const { title, narrative } = buildBreachNarrative(breachReason)
  const currency = account.currency ?? 'USD'
  const breachEvent = (metrics?.breachEvent as Record<string, unknown> | null) ?? null
  const breachTime = (() => {
    const eventTimeMs = breachEvent?.time_ms ?? breachEvent?.closed_time_ms ?? breachEvent?.timestamp_ms
    if (typeof eventTimeMs === 'number') return new Date(eventTimeMs)
    if (typeof eventTimeMs === 'string' && Number.isFinite(Number(eventTimeMs))) return new Date(Number(eventTimeMs))
    return account.breachedAt ?? account.updatedAt ?? new Date()
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
    traderName: account.user?.fullName ?? account.user?.email ?? 'Trader',
    traderEmail: account.user?.email ?? '',
    accountSize: account.accountSize,
    phase: formatTitleCase(account.phase),
    challengeType: formatTitleCase(account.challengeType ?? 'two_step'),
    platform: account.platform ?? 'ctrader',
    currency,
    status: formatTitleCase(account.status),
    generatedAt: new Date(),
    breachReason,
    breachReasonLabel: title,
    breachNarrative: narrative,
    breachTimeLabel: formatCompactDate(breachTime),
    peakBalance: formatCurrencyValue(peak, currency),
    balanceBeforeTrade: formatCurrencyValue(balanceBeforeTrade, currency),
    equityAtBreach: formatCurrencyValue(equityAtBreach, currency),
    dailyLimit: dailyLimitValue != null ? formatCurrencyValue(dailyLimitValue, currency) : null,
    maxLimit: maxLimitValue != null ? formatCurrencyValue(maxLimitValue, currency) : null,
    dailyDrawdownUsageLabel: dailyLimitValue != null ? percentLabel(dailyLossUsed, dailyLossLimit) : null,
    maxDrawdownUsageLabel: maxLimitValue != null ? percentLabel(maxLossUsed, maxLossLimit) : null,
    breachDetails: [
      { label: 'Reason', value: breachReason },
      { label: 'Breach Time', value: `${formatCompactDate(breachTime)} ${formatCompactTime(breachTime)}` },
      { label: 'Peak Balance', value: formatCurrencyValue(peak, currency) },
      { label: 'Equity Low', value: formatCurrencyValue(equityAtBreach, currency) },
    ],
    openPositions: openPositionsAtBreach.slice(0, 6).map((position) => ({
      symbol: String(position.symbol ?? '-'),
      ticket: String(position.ticket ?? position.position_id ?? '-'),
      floatingPnl: formatCurrencyValue(Number(position.floating_pnl ?? 0), currency),
      time: formatCompactTime(typeof position.open_time_ms === 'number' ? position.open_time_ms : breachTime),
    })),
    analysisParagraph: `Your account started from a protected balance profile and the system tracked equity, balance, and drawdown continuously. At the breach point, equity reached ${formatCurrencyValue(equityAtBreach, currency)}, which triggered the ${title.toLowerCase()} condition according to your account rules.`,
    guidance: [
      'Always use stop-loss to control downside risk.',
      'Avoid stacking multiple correlated or high-risk positions.',
      'Monitor equity, not just balance, during open trades.',
      'Reduce position size during volatile market conditions.',
    ],
  }
}

export const listAdminUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const fxConfig = await getFxRatesConfig()
    const usdNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cTraderAccounts: true,
        orders: {
          where: { status: 'completed' },
        },
        payouts: { include: { account: true } },
      },
    })

    const usersPayload = users.map((user) => {
      const challengeAccounts = user.cTraderAccounts.filter((account) =>
        ['active', 'assigned', 'assigned_pending_access', 'passed', 'funded', 'breached', 'completed', 'awaiting_reset', 'withdraw_requested'].includes(
          account.status.toLowerCase()
        )
      )
      const fundedAccounts = challengeAccounts.filter((account) => {
        const status = account.status.toLowerCase()
        return status === 'funded' || account.phase?.toLowerCase().includes('funded') || account.challengeType === 'instant_funded'
      })
      const breachedAccounts = challengeAccounts.filter((account) => account.status.toLowerCase() === 'breached')

      const totalNetKobo = user.orders.reduce(
        (sum, order) => sum + toUsdKobo(order.netAmountKobo, order.currency, usdNgnRate),
        0,
      )
      const orderCount = user.orders.length
      const payoutTotalKobo = user.payouts.reduce(
        (sum, payout) => sum + toUsdKobo(payout.amountKobo, payout.account?.currency, usdNgnRate),
        0,
      )

      const tradingStatus = breachedAccounts.length > 0
        ? 'Breached'
        : fundedAccounts.length > 0
          ? 'Funded'
          : challengeAccounts.length > 0
            ? 'Challenge Active'
            : 'No Account'

      return {
        user_id: user.id,
        name: user.fullName ?? user.email,
        email: user.email,
        status: user.status ?? 'active',
        trading: tradingStatus,
        accounts: `${challengeAccounts.length} / ${fundedAccounts.length}`,
        revenue: formatUsdCompact(totalNetKobo),
        orders: String(orderCount),
        payouts: formatUsdCompact(payoutTotalKobo),
      }
    })

    const fundedUsers = usersPayload.filter((user) => user.trading === 'Funded').length
    const breachedUsers = usersPayload.filter((user) => user.trading === 'Breached').length

    res.json({
      users: usersPayload,
      stats: {
        total_users: usersPayload.length,
        funded_users: fundedUsers,
        breached_users: breachedUsers,
      },
    })
  } catch (err) {
    next(err as Error)
  }
}

const mapAccountPhaseLabel = (phase?: string | null) => {
  if (!phase) return 'Phase 1'
  const normalized = phase.toLowerCase()
  if (normalized.includes('phase_2') || normalized.includes('phase 2')) return 'Phase 2'
  if (normalized.includes('funded')) return 'Funded'
  return 'Phase 1'
}

export const listActiveChallengeAccounts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform } = _req.query as { platform?: string }
    const normalizedPlatform = platform?.toLowerCase()
    const accounts = await prisma.cTraderAccount.findMany({
      where: {
        status: { in: ['active', 'assigned', 'assigned_pending_access', 'awaiting_reset', 'withdraw_requested', 'admin_checking'] },
        ...(normalizedPlatform ? { platform: { equals: normalizedPlatform, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { user: true, metrics: true },
    })

    res.json({
      accounts: accounts.map((account) => {
        const pnl = (account.metrics?.equity ?? account.metrics?.balance ?? 0) - (account.initialBalance ?? 0)
        return {
          id: account.id,
          challenge_id: account.challengeId,
          user_id: account.userId,
          trader_name: account.user?.fullName ?? null,
          trader_email: account.user?.email ?? null,
          account_size: account.accountSize,
          currency: account.currency ?? null,
          phase: mapAccountPhaseLabel(account.phase),
          mt5_account: account.accountNumber,
          mt5_server: account.brokerName,
          platform: account.platform ?? 'ctrader',
          objective_status: account.status,
          current_pnl: pnl ? `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toLocaleString('en-US')}` : '+$0',
        }
      }),
    })
  } catch (err) {
    next(err as Error)
  }
}

const resolvePeriodStart = (period?: string) => {
  const now = new Date()
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  if (period === 'week') {
    const day = now.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() + mondayOffset)
    startOfWeek.setHours(0, 0, 0, 0)
    return startOfWeek
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return null
}

const resolveAtticStatusTimestamp = (account: {
  status: string
  createdAt: Date
  updatedAt: Date
  passedAt: Date | null
  breachedAt: Date | null
}) => {
  const status = String(account.status ?? '').toLowerCase()
  if (status === 'breached') return account.breachedAt ?? account.updatedAt
  if (['passed', 'funded', 'completed'].includes(status)) return account.passedAt ?? account.updatedAt
  return account.createdAt
}

export const listAtticChallengeAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = String(req.query.period ?? 'today').toLowerCase()
    const page = Math.max(1, Number(req.query.page ?? 1) || 1)
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 10) || 10))
    const search = String(req.query.search ?? '').trim().toLowerCase()
    const startDate = resolvePeriodStart(period)

    const accounts = await prisma.cTraderAccount.findMany({
      where: { challengeType: { equals: 'attic', mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      include: { user: true, metrics: true },
    })

    const matchesSearch = (account: (typeof accounts)[number]) => {
      const email = String(account.user?.email ?? '').toLowerCase()
      const name = String(account.user?.fullName ?? '').toLowerCase()
      const accountNumber = String(account.accountNumber ?? '').toLowerCase()
      const challengeId = String(account.challengeId ?? '').toLowerCase()
      return email.includes(search) || name.includes(search) || accountNumber.includes(search) || challengeId.includes(search)
    }

    const filtered = accounts.filter((account) => {
      if (!search) return true
      return matchesSearch(account)
    })

    const summaryRows = filtered.filter((account) => {
      if (!startDate) return true
      const statusDate = resolveAtticStatusTimestamp(account)
      return statusDate >= startDate
    })

    const summary = summaryRows.reduce(
      (acc, account) => {
        const status = String(account.status ?? '').toLowerCase()
        if (status === 'breached') acc.breached += 1
        else if (['passed', 'funded', 'completed'].includes(status)) acc.passed += 1
        else acc.active += 1
        return acc
      },
      { active: 0, passed: 0, breached: 0 }
    )

    const total = filtered.length
    const pages = Math.max(1, Math.ceil(total / limit))
    const startIndex = (page - 1) * limit
    const paginated = filtered.slice(startIndex, startIndex + limit)

    res.json({
      summary: {
        period,
        total: summaryRows.length,
        active: summary.active,
        passed: summary.passed,
        breached: summary.breached,
      },
      accounts: paginated.map((account) => {
        const pnl = (account.metrics?.equity ?? account.metrics?.balance ?? 0) - (account.initialBalance ?? 0)
        return {
          id: account.id,
          challenge_id: account.challengeId,
          user_id: account.userId,
          trader_name: account.user?.fullName ?? null,
          trader_email: account.user?.email ?? null,
          account_size: account.accountSize,
          currency: account.currency ?? null,
          phase: mapAccountPhaseLabel(account.phase),
          mt5_account: account.accountNumber,
          mt5_server: account.brokerName,
          platform: account.platform ?? 'ctrader',
          objective_status: account.status,
          current_pnl: pnl ? `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toLocaleString('en-US')}` : '+$0',
          created_at: account.createdAt.toISOString(),
          assigned_at: account.assignedAt?.toISOString() ?? null,
          passed_at: account.passedAt?.toISOString() ?? null,
          breached_at: account.breachedAt?.toISOString() ?? null,
        }
      }),
      pagination: { page, limit, total, pages },
    })
  } catch (err) {
    next(err as Error)
  }
}

const formatPnl = (pnl: number) => `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toLocaleString('en-US')}`

export const listFundedChallengeAccounts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform } = _req.query as { platform?: string }
    const normalizedPlatform = platform?.toLowerCase()
    const accounts = await prisma.cTraderAccount.findMany({
      where: {
        OR: [
          { status: { equals: 'funded', mode: 'insensitive' } },
          { phase: { contains: 'funded', mode: 'insensitive' } },
        ],
        ...(normalizedPlatform ? { platform: { equals: normalizedPlatform, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { user: true, metrics: true },
    })

    res.json({
      accounts: accounts.map((account) => {
        const pnl = (account.metrics?.equity ?? account.metrics?.balance ?? 0) - (account.initialBalance ?? 0)
        return {
          challenge_id: account.challengeId,
          user_id: account.userId,
          trader_name: account.user?.fullName ?? null,
          trader_email: account.user?.email ?? null,
          account_size: account.accountSize,
          currency: account.currency ?? null,
          phase: mapAccountPhaseLabel(account.phase ?? 'funded'),
          mt5_account: account.accountNumber,
          mt5_server: account.brokerName,
          platform: account.platform ?? 'ctrader',
          objective_status: account.status,
          current_pnl: formatPnl(pnl),
          profit: formatPnl(pnl),
        }
      }),
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listTopFundedTraders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform } = _req.query as { platform?: string }
    const normalizedPlatform = platform?.toLowerCase()
    const accounts = await prisma.cTraderAccount.findMany({
      where: {
        OR: [
          { status: { equals: 'funded', mode: 'insensitive' } },
          { phase: { contains: 'funded', mode: 'insensitive' } },
        ],
        ...(normalizedPlatform ? { platform: { equals: normalizedPlatform, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { user: true, metrics: true },
    })

    const sorted = accounts
      .map((account) => {
        const pnl = (account.metrics?.equity ?? account.metrics?.balance ?? 0) - (account.initialBalance ?? 0)
        return { account, pnl }
      })
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 10)

    res.json({
      accounts: sorted.map(({ account, pnl }) => ({
        challenge_id: account.challengeId,
        user_id: account.userId,
        trader_name: account.user?.fullName ?? null,
        trader_email: account.user?.email ?? null,
        account_size: account.accountSize,
        currency: account.currency ?? null,
        phase: mapAccountPhaseLabel(account.phase ?? 'funded'),
        mt5_account: account.accountNumber,
        mt5_server: account.brokerName,
        platform: account.platform ?? 'ctrader',
        objective_status: account.status,
        current_pnl: formatPnl(pnl),
        profit: formatPnl(pnl),
        win_rate: account.metrics?.winRate ? `${account.metrics.winRate.toFixed(1)}%` : '0%',
      })),
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listBreachedChallengeAccounts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const breached = await prisma.cTraderAccount.findMany({
      where: { status: { equals: 'breached', mode: 'insensitive' } },
      orderBy: { breachedAt: 'desc' },
      include: { user: true, metrics: true },
    })

    res.json({
      accounts: breached.map((account) => ({
        challenge_id: account.challengeId,
        user_id: account.userId,
        trader_name: account.user?.fullName ?? null,
        trader_email: account.user?.email ?? null,
        account_size: account.accountSize,
        currency: account.currency ?? null,
        phase: mapAccountPhaseLabel(account.phase),
        mt5_account: account.accountNumber,
        breach_reason: account.metrics?.breachReason ?? null,
        breached_at: account.breachedAt?.toISOString() ?? null,
      })),
    })
  } catch (err) {
    next(err as Error)
  }
}

export const lookupChallengeAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountNumber = String(req.query.account_number ?? '').trim()
    if (!accountNumber) {
      throw new ApiError('account_number is required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: { accountNumber },
      include: { user: true, metrics: true },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    const ensuredBreachReport = (String(account.status).toLowerCase() === 'breached' && account.userId)
      ? await getOrCreateBreachReport({
          userId: account.userId,
          accountId: account.id,
          challengeId: account.challengeId,
          report: buildAdminBreachReportPayload(account),
        })
      : null

    res.json({
      account: {
        id: account.id,
        challenge_id: account.challengeId,
        account_number: account.accountNumber,
        platform: account.platform ?? 'ctrader',
        status: account.status,
        phase: account.phase,
        account_size: account.accountSize,
        currency: account.currency ?? null,
        trader_name: account.user?.fullName ?? null,
        trader_email: account.user?.email ?? null,
        breach_reason: account.metrics?.breachReason ?? null,
        breached_at: account.breachedAt?.toISOString() ?? null,
        breach_event: account.metrics?.breachEvent ?? null,
        trade_duration_violations: account.metrics?.tradeDurationViolations ?? null,
        breach_balance: account.metrics?.breachBalance ?? null,
        daily_breach_balance: account.metrics?.dailyBreachBalance ?? null,
        daily_high_balance: account.metrics?.dailyHighBalance ?? null,
        daily_low_equity: account.metrics?.dailyLowEquity ?? null,
        min_equity: account.metrics?.minEquity ?? null,
        highest_balance: account.metrics?.highestBalance ?? null,
        last_feed_at: account.metrics?.capturedAt?.toISOString() ?? null,
        breach_report_url: ensuredBreachReport?.certificateUrl ?? null,
      },
    })
  } catch (err) {
    next(err as Error)
  }
}

export const lookupUserPaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = String(req.query.email ?? '').trim().toLowerCase()
    if (!email) {
      throw new ApiError('email is required', 400)
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        payoutMethodType: true,
        payoutBankName: true,
        payoutBankCode: true,
        payoutAccountNumber: true,
        payoutAccountName: true,
        payoutCryptoCurrency: true,
        payoutCryptoAddress: true,
        payoutCryptoFirstName: true,
        payoutCryptoLastName: true,
        payoutVerifiedAt: true,
        payoutUpdatedAt: true,
      },
    })

    if (!user) {
      throw new ApiError('User not found', 404)
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        payout_method_type: user.payoutMethodType,
        payout_bank_name: user.payoutBankName,
        payout_bank_code: user.payoutBankCode,
        payout_account_number: user.payoutAccountNumber,
        payout_account_name: user.payoutAccountName,
        payout_crypto_currency: user.payoutCryptoCurrency,
        payout_crypto_address: user.payoutCryptoAddress,
        payout_crypto_first_name: user.payoutCryptoFirstName,
        payout_crypto_last_name: user.payoutCryptoLastName,
        payout_verified_at: user.payoutVerifiedAt?.toISOString() ?? null,
        payout_updated_at: user.payoutUpdatedAt?.toISOString() ?? null,
      },
    })
  } catch (err) {
    next(err as Error)
  }
}

export const clearUserPaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    if (!email) {
      throw new ApiError('email is required', 400)
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } })
    if (!user) {
      throw new ApiError('User not found', 404)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        payoutMethodType: null,
        payoutBankName: null,
        payoutBankCode: null,
        payoutAccountNumber: null,
        payoutAccountName: null,
        payoutCryptoCurrency: null,
        payoutCryptoAddress: null,
        payoutCryptoFirstName: null,
        payoutCryptoLastName: null,
        payoutSafeHavenReference: null,
        payoutSafeHavenPayload: Prisma.JsonNull,
        payoutVerifiedAt: null,
        payoutUpdatedAt: new Date(),
      },
    })

    res.json({ message: 'User payout method cleared successfully.', email: user.email })
  } catch (err) {
    next(err as Error)
  }
}

const formatCurrency = (amountKobo: number) =>
  `$${(amountKobo / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100
  }
  return ((current - previous) / previous) * 100
}

const startOfDay = (date = new Date()) => {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export const getDashboardStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const fxConfig = await getFxRatesConfig()
    const usdNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
    const now = new Date()
    const todayStart = startOfDay(now)
    const yesterdayStart = startOfDay(new Date(todayStart.getTime() - 24 * 60 * 60 * 1000))
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(monthStart.getTime() - 1)

    const sumOrdersUsd = async (where: Record<string, unknown>) => {
      const [usdOrders, ngnOrders] = await Promise.all([
        prisma.order.aggregate({ _sum: { netAmountKobo: true }, where: { ...where, currency: 'USD' } }),
        prisma.order.aggregate({ _sum: { netAmountKobo: true }, where: { ...where, currency: 'NGN' } }),
      ])
      const usdKobo = usdOrders._sum.netAmountKobo ?? 0
      const ngnKobo = ngnOrders._sum.netAmountKobo ?? 0
      return usdKobo + toUsdKobo(ngnKobo, 'NGN', usdNgnRate)
    }

    const sumPayoutsUsd = async (where: Record<string, unknown>) => {
      const payouts = await prisma.payout.findMany({
        where,
        select: { amountKobo: true, account: { select: { currency: true } } },
      })
      return payouts.reduce(
        (sum, payout) => sum + toUsdKobo(payout.amountKobo, payout.account?.currency, usdNgnRate),
        0,
      )
    }

    const [
      totalRevenueKobo,
      totalRevenuePrevKobo,
      todayRevenueKobo,
      yesterdayRevenueKobo,
      totalPayoutsKobo,
      totalPayoutsPrevKobo,
      todayPayoutsKobo,
      yesterdayPayoutsKobo,
      totalUsers,
      totalUsersPrev,
      activeAccounts,
      fundedAccounts,
      pendingPayoutCount,
      breachedToday,
      breachedYesterday,
    ] = await Promise.all([
      sumOrdersUsd({ status: 'completed' }),
      sumOrdersUsd({ status: 'completed', createdAt: { gte: prevMonthStart, lte: prevMonthEnd } }),
      sumOrdersUsd({ status: 'completed', createdAt: { gte: todayStart } }),
      sumOrdersUsd({ status: 'completed', createdAt: { gte: yesterdayStart, lt: todayStart } }),
      sumPayoutsUsd({ status: 'completed' }),
      sumPayoutsUsd({ status: 'completed', createdAt: { gte: prevMonthStart, lte: prevMonthEnd } }),
      sumPayoutsUsd({ status: 'completed', createdAt: { gte: todayStart } }),
      sumPayoutsUsd({ status: 'completed', createdAt: { gte: yesterdayStart, lt: todayStart } }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { lt: monthStart } } }),
      prisma.cTraderAccount.count({ where: { status: { in: ['active', 'funded', 'assigned', 'assigned_pending_access', 'awaiting_reset', 'withdraw_requested'] } } }),
      prisma.cTraderAccount.count({
        where: {
          status: { in: ['funded', 'active'] },
          OR: [
            { phase: { contains: 'funded', mode: 'insensitive' } },
            { challengeType: 'instant_funded' },
          ],
        },
      }),
      prisma.payout.count({ where: { status: 'pending_approval' } }),
      prisma.cTraderAccount.count({
        where: { status: 'breached', breachedAt: { gte: todayStart } },
      }),
      prisma.cTraderAccount.count({
        where: { status: 'breached', breachedAt: { gte: yesterdayStart, lt: todayStart } },
      }),
    ])

    res.json({
      kpis: {
        totalRevenue: formatCurrency(totalRevenueKobo),
        totalRevenueChange: percentageChange(totalRevenueKobo, totalRevenuePrevKobo),
        todaySales: formatCurrency(todayRevenueKobo),
        todaySalesChange: percentageChange(todayRevenueKobo, yesterdayRevenueKobo),
        totalPayouts: formatCurrency(totalPayoutsKobo),
        totalPayoutsChange: percentageChange(totalPayoutsKobo, totalPayoutsPrevKobo),
        newSignups: totalUsers,
        newSignupsChange: percentageChange(totalUsers, totalUsersPrev),
        activeChallengeAccounts: activeAccounts,
        activeChallengeAccountsChange: 0,
        passRate: String(fundedAccounts),
        passRateChange: 0,
        pendingPayoutRequests: String(pendingPayoutCount),
        pendingPayoutRequestsChange: 0,
        todayApprovedPayouts: String(breachedToday),
        todayApprovedPayoutsChange: percentageChange(breachedToday, breachedYesterday),
      },
    })
  } catch (err) {
    next(err as Error)
  }
}