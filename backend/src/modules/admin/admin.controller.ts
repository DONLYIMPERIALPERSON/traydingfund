import { Request, Response } from 'express'

export const getAdminMe = (_req: Request, res: Response) => {
  res.json({
    id: 1,
    descope_user_id: 'mock-admin-1',
    email: 'admin@machefunded.com',
    full_name: 'Admin Operator',
    role: 'super_admin',
    status: 'active',
    allowed_pages: [
      'analysis',
      'users',
      'accounts',
      'fundedAccounts',
      'breaches',
      'orders',
      'payouts',
      'kycReview',
      'referrals',
      'financeAnalysis',
      'coupons',
      'supportTickets',
      'settings',
      'mt5',
      'sendAnnouncement',
      'salary',
    ],
    can_assign_mt5: true,
  })
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