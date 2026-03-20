import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'

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

export const listAdminUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cTraderAccounts: true,
        orders: true,
        payouts: true,
      },
    })

    const usersPayload = users.map((user) => {
      const challengeAccounts = user.cTraderAccounts.filter((account) =>
        ['active', 'assigned', 'assigned_pending_access', 'passed', 'funded', 'breached', 'completed'].includes(
          account.status.toLowerCase()
        )
      )
      const fundedAccounts = challengeAccounts.filter((account) => {
        const status = account.status.toLowerCase()
        return status === 'funded' || account.phase?.toLowerCase().includes('funded') || account.challengeType === 'instant_funded'
      })
      const breachedAccounts = challengeAccounts.filter((account) => account.status.toLowerCase() === 'breached')

      const totalNetKobo = user.orders.reduce((sum, order) => sum + order.netAmountKobo, 0)
      const orderCount = user.orders.length
      const payoutTotalKobo = user.payouts.reduce((sum, payout) => sum + payout.amountKobo, 0)

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
    const accounts = await prisma.cTraderAccount.findMany({
      where: {
        status: { in: ['active', 'assigned', 'assigned_pending_access'] },
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
          phase: mapAccountPhaseLabel(account.phase),
          mt5_account: account.accountNumber,
          mt5_server: account.brokerName,
          objective_status: account.status,
          current_pnl: pnl ? `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toLocaleString('en-US')}` : '+$0',
        }
      }),
    })
  } catch (err) {
    next(err as Error)
  }
}

const formatPnl = (pnl: number) => `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toLocaleString('en-US')}`

export const listFundedChallengeAccounts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await prisma.cTraderAccount.findMany({
      where: {
        OR: [
          { status: { equals: 'funded', mode: 'insensitive' } },
          { phase: { contains: 'funded', mode: 'insensitive' } },
        ],
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
          phase: mapAccountPhaseLabel(account.phase ?? 'funded'),
          mt5_account: account.accountNumber,
          mt5_server: account.brokerName,
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
    const accounts = await prisma.cTraderAccount.findMany({
      where: {
        OR: [
          { status: { equals: 'funded', mode: 'insensitive' } },
          { phase: { contains: 'funded', mode: 'insensitive' } },
        ],
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
        phase: mapAccountPhaseLabel(account.phase ?? 'funded'),
        mt5_account: account.accountNumber,
        mt5_server: account.brokerName,
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
    const now = new Date()
    const todayStart = startOfDay(now)
    const yesterdayStart = startOfDay(new Date(todayStart.getTime() - 24 * 60 * 60 * 1000))
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(monthStart.getTime() - 1)

    const [
      totalRevenue,
      totalRevenuePrev,
      todayRevenue,
      yesterdayRevenue,
      totalPayouts,
      totalPayoutsPrev,
      todayPayouts,
      yesterdayPayouts,
      totalUsers,
      totalUsersPrev,
      activeAccounts,
      fundedAccounts,
      pendingPayoutsKobo,
      pendingPayoutCount,
      breachedToday,
      breachedYesterday,
    ] = await Promise.all([
      prisma.order.aggregate({ _sum: { netAmountKobo: true }, where: { status: 'completed' } }),
      prisma.order.aggregate({
        _sum: { netAmountKobo: true },
        where: { status: 'completed', createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      }),
      prisma.order.aggregate({ _sum: { netAmountKobo: true }, where: { status: 'completed', createdAt: { gte: todayStart } } }),
      prisma.order.aggregate({ _sum: { netAmountKobo: true }, where: { status: 'completed', createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.payout.aggregate({ _sum: { amountKobo: true }, where: { status: 'completed' } }),
      prisma.payout.aggregate({
        _sum: { amountKobo: true },
        where: { status: 'completed', createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      }),
      prisma.payout.aggregate({ _sum: { amountKobo: true }, where: { status: 'completed', createdAt: { gte: todayStart } } }),
      prisma.payout.aggregate({ _sum: { amountKobo: true }, where: { status: 'completed', createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { lt: monthStart } } }),
      prisma.cTraderAccount.count({ where: { status: { in: ['active', 'funded', 'assigned', 'assigned_pending_access'] } } }),
      prisma.cTraderAccount.count({
        where: {
          status: { in: ['funded', 'active'] },
          OR: [
            { phase: { contains: 'funded', mode: 'insensitive' } },
            { challengeType: 'instant_funded' },
          ],
        },
      }),
      prisma.payout.aggregate({
        _sum: { amountKobo: true },
        where: { status: 'pending_approval' },
      }),
      prisma.payout.count({ where: { status: 'pending_approval' } }),
      prisma.cTraderAccount.count({
        where: { status: 'breached', breachedAt: { gte: todayStart } },
      }),
      prisma.cTraderAccount.count({
        where: { status: 'breached', breachedAt: { gte: yesterdayStart, lt: todayStart } },
      }),
    ])

    const totalRevenueKobo = totalRevenue._sum.netAmountKobo ?? 0
    const totalRevenuePrevKobo = totalRevenuePrev._sum.netAmountKobo ?? 0
    const todayRevenueKobo = todayRevenue._sum.netAmountKobo ?? 0
    const yesterdayRevenueKobo = yesterdayRevenue._sum.netAmountKobo ?? 0

    const totalPayoutsKobo = totalPayouts._sum.amountKobo ?? 0
    const totalPayoutsPrevKobo = totalPayoutsPrev._sum.amountKobo ?? 0
    const todayPayoutsKobo = todayPayouts._sum.amountKobo ?? 0
    const yesterdayPayoutsKobo = yesterdayPayouts._sum.amountKobo ?? 0

    const pendingPayoutKobo = pendingPayoutsKobo._sum.amountKobo ?? 0

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