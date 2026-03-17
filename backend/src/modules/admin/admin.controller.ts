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

export const getDashboardStats = (_req: Request, res: Response) => {
  res.json({
    kpis: {
      totalRevenue: '$42.5m',
      totalRevenueChange: 4.8,
      todaySales: '$1.35m',
      todaySalesChange: 2.1,
      totalPayouts: '$18.9m',
      totalPayoutsChange: -1.2,
      newSignups: 128,
      newSignupsChange: 6.4,
      activeChallengeAccounts: 312,
      activeChallengeAccountsChange: 3.9,
      passRate: '64%',
      passRateChange: 1.3,
      pendingPayoutRequests: '$2.1m',
      pendingPayoutRequestsChange: -0.5,
      todayApprovedPayouts: '$620k',
      todayApprovedPayoutsChange: 5.0,
    },
  })
}