type Nullable<T> = T | null

export type AdminAuthMeResponse = {
  id: number
  descope_user_id?: string
  email: string
  full_name: string | null
  role: string
  status?: string
  allowed_pages?: string[]
  can_assign_mt5?: boolean
}

export type AdminAllowlistEntry = any
export type AdminCoupon = any
export type AdminKycProfileItem = {
  user_id: number
  name: string
  email: string
  status: string
  eligible_since: string | null
  funded_accounts: number
  total_challenge_accounts: number
}
export type AdminKycRequestUser = {
  id: number
  name: string
  email: string
  payout_method_type: string | null
  payout_bank_name: string | null
  payout_bank_code: string | null
  payout_account_number: string | null
  payout_account_name: string | null
  payout_crypto_currency: string | null
  payout_crypto_address: string | null
  payout_crypto_first_name?: string | null
  payout_crypto_last_name?: string | null
  payout_verified_at: string | null
}
export type AdminKycRequestItem = {
  id: number
  status: string
  document_type: string
  document_number: string
  id_front_url: string
  id_back_url: string | null
  selfie_url?: string | null
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  decline_reason: string | null
  user: AdminKycRequestUser
}
export type AdminKycRequestResponse = {
  requests: AdminKycRequestItem[]
  pagination: { page: number; limit: number; total: number; pages: number }
}
export type AdminUsersListItem = any
export type AffiliateCommission = any
export type AffiliateOverviewStats = any
export type AffiliatePayout = any
export type ChallengeAccountListItem = any
export type ChallengeBreachListItem = any
export type ChallengePlanConfig = any
export type MT5Account = {
  id: number
  account_number: string
  server: string
  account_size: string
  challenge_type?: string | null
  status: string
  phase?: string
  challenge_id?: string
  assigned_user_id?: number | null
  assigned_user_email?: string | null
  assigned_at?: string | null
  assignment_mode?: string | null
  assigned_by_admin_name?: string | null
  access_status?: string | null
}
export type Order = {
  id: number
  provider_order_id: string
  status: string
  assignment_status: string
  account_size: string
  net_amount_formatted: string
  created_at: string
  paid_at: string | null
  payment_method?: string
  payment_provider?: string
  crypto_currency?: string | null
  crypto_address?: string | null
  user: { id: string; name: string; email: string }
}
export type OrderStats = any
export type PayoutRequest = {
  id: number
  provider_order_id: string
  status: string
  amount_kobo: number
  amount_formatted: string
  created_at: string
  completed_at: string | null
  user: { id: number; name: string; email: string }
  account: { challenge_id: string | null; account_size: string | null }
  metadata?: Record<string, unknown>
}
export type PayoutStats = {
  period: string
  pending_review: number
  approved_today: number
  paid_today_kobo: number
  paid_today_formatted: string
  rejected: number
}
export type SalaryBank = any
export type SalaryDisbursementPreview = any
export type SalaryDisbursementResponse = any
export type SalaryStaff = any
export type SendAnnouncementResponse = any
export type SupportChat = any
export type SupportMessage = any
export type SupportTicket = any
export type UserChallengeAccount = any
export type UserOrder = any
export type UserPayout = any
export type UserProfileData = any
export type UserSupportTicket = any
export type TradingObjectivesConfig = any
export type TradingObjectivesResponse = any

const mockAdminUser: AdminAuthMeResponse = {
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
    'tradingRules',
  ],
  can_assign_mt5: true,
}

let persistedAdminUser: Nullable<AdminAuthMeResponse> = mockAdminUser

const mockDashboardStats = {
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
  operationsQueues: {
    payoutsPendingReview: 12,
    payoutsOldestHours: 8,
    supportTicketsOpen: 6,
    supportTicketsOldestHours: 5,
    provisioningFailures: 1,
    webhookFailures: 0,
  },
  challengeOutcomes: {
    passed: 84,
    failed: 41,
    expired: 9,
  },
  accountCounts: {
    ready: 48,
    phase1: 160,
    phase2: 74,
    funded: 30,
  },
  supportOverview: {
    openTickets: 6,
    avgFirstResponse: '1h 12m',
    avgResolution: '7h 05m',
  },
  systemHealth: {
    brokerBridge: 'Connected',
    tradeIngestionLag: '1.8m',
    webhooksSuccess: '99.2%',
    emailBounce: '0.4%',
    kycProvider: 'Up',
  },
}

const mockChallengeAccounts: ChallengeAccountListItem[] = [
  {
    challenge_id: 'CH-1001',
    user_id: 1001,
    trader_name: 'Amina Yusuf',
    trader_email: 'amina@machefunded.com',
    account_size: '$10k',
    phase: 'Phase 1',
    mt5_account: '100110',
    mt5_server: 'MT5-Live-01',
    mt5_password: '••••••',
    objective_status: 'On Track',
    current_pnl: '+$12,400',
  },
  {
    challenge_id: 'CH-1002',
    user_id: 1002,
    trader_name: 'David Cole',
    trader_email: 'david@traders.io',
    account_size: '$50k',
    phase: 'Phase 2',
    mt5_account: '100245',
    mt5_server: 'MT5-Live-02',
    mt5_password: '••••••',
    objective_status: 'At Risk',
    current_pnl: '-$8,900',
  },
]

export const mockBreaches = {
  accounts: [
    {
      challenge_id: 'CH-0944',
      user_id: 990,
      trader_name: 'Ibrahim Musa',
      trader_email: 'ibrahim@fx.com',
      account_size: '$30k',
      phase: 'Phase 1',
      mt5_account: '990330',
      breach_reason: 'drawdown_limit',
      breached_at: new Date().toISOString(),
    },
  ],
}

export const mockFundedAccounts: ChallengeAccountListItem[] = [
  {
    challenge_id: 'FD-2001',
    user_id: 1003,
    trader_name: 'Ada Okafor',
    trader_email: 'ada.okafor@market.com',
    account_size: '$100k',
    phase: 'Funded',
    mt5_account: '220188',
    mt5_server: 'cTrader-Live',
    mt5_password: '••••••',
    profit: '$620k',
    win_rate: '61%',
    current_pnl: '+$85,000',
  },
]

const mockAdminUsers = {
  users: [
    {
      user_id: 1001,
      name: 'Amina Yusuf',
      email: 'amina@machefunded.com',
      status: 'Active',
      trading: 'Challenge Active',
      accounts: '2 / 0',
      revenue: '$220k',
      orders: '3',
      payouts: '$0',
    },
    {
      user_id: 1002,
      name: 'David Cole',
      email: 'david@traders.io',
      status: 'Suspended',
      trading: 'Breached',
      accounts: '1 / 0',
      revenue: '$75k',
      orders: '1',
      payouts: '$0',
    },
  ],
  stats: {
    total_users: 1280,
    funded_users: 98,
    breached_users: 214,
  },
}

const mockOrders = {
  orders: [
    {
      id: 301,
      provider_order_id: 'ORD-301',
      status: 'paid',
      assignment_status: 'assigned',
      account_size: '$10k',
      net_amount_formatted: '$45,000',
      created_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      user: { id: '1001', name: 'Amina Yusuf', email: 'amina@machefunded.com' },
      challenge_id: 'CH-1001',
    },
  ],
  pagination: { page: 1, limit: 50, total: 1, pages: 1 },
}

const mockOrderStats = {
  period: 'today',
  total_orders: 24,
  paid_orders: 18,
  pending_orders: 4,
  failed_orders: 2,
  total_volume_formatted: '$2.4m',
  success_rate_formatted: '75%',
}

const mockPayoutStats = {
  period: 'today',
  pending_review: 4,
  approved_today: 6,
  paid_today_kobo: 62000000,
  paid_today_formatted: '$620k',
  rejected: 1,
}

const mockPayoutRequests = {
  payouts: [],
  pagination: { page: 1, limit: 50, total: 0, pages: 1 },
}

export const mockSupportTickets: SupportTicket[] = [
  {
    id: 'T-1001',
    subject: 'Login assistance',
    status: 'open',
    priority: 'medium',
    assigned_to: 'Admin Operator',
    user_name: 'Amina Yusuf',
    user_email: 'amina@machefunded.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_message: 'Need help with email verification.',
    unread_count: 2,
    user_unread_count: 0,
  },
]

export const mockSupportChat: SupportChat = {
  id: 'T-1001',
  user_id: 1001,
  subject: 'Login assistance',
  status: 'open',
  priority: 'medium',
  assigned_to: 'Admin Operator',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_message: 'Need help with email verification.',
  unread_count: 2,
  user_unread_count: 0,
  messages: [
    {
      id: 'MSG-1',
      chat_id: 'T-1001',
      sender: 'user',
      message: 'I cannot verify my email.',
      image_url: null,
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ],
}

let mockAllowlist: AdminAllowlistEntry[] = [
  {
    id: 1,
    email: 'admin@machefunded.com',
    full_name: 'Admin Operator',
    descope_user_id: 'mock-admin-1',
    role: 'super_admin',
    status: 'active',
    require_mfa: false,
    mfa_enrolled: true,
    allowed_pages: mockAdminUser.allowed_pages ?? [],
    created_by_user_id: 1,
    can_assign_mt5: true,
  },
]

const mockMonthlyFinance = {
  monthlyFinance: [
    { month: 'Jan', totalPurchase: '$3.1m', totalPayouts: '$1.4m' },
    { month: 'Feb', totalPurchase: '$2.7m', totalPayouts: '$1.2m' },
    { month: 'Mar', totalPurchase: '$3.9m', totalPayouts: '$1.8m' },
  ],
}

export let mockCoupons: any = {
  coupons: [
    {
      id: 1,
      code: 'WELCOME10',
      discount_type: 'percent',
      discount_value: 10,
      is_active: true,
      expires_at: null,
      max_uses: 250,
      used_count: 42,
      applicable_plan_ids: ['two-step-10k'],
      applies_to_all_plans: false,
      status: 'Active',
    },
  ],
}

export const mockKycProfiles = {
  profiles: [
    {
      user_id: 1001,
      name: 'Amina Yusuf',
      email: 'amina@machefunded.com',
      status: 'pending',
      eligible_since: new Date().toISOString(),
      funded_accounts: 0,
      total_challenge_accounts: 2,
    },
  ],
  stats: { eligible_profiles: 12, today_eligible: 3 },
}

const mockSalaryBanks = {
  banks: [
    { bank_code: '001', bank_name: 'Mock Bank' },
    { bank_code: '002', bank_name: 'Demo Trust' },
  ],
}

let mockSalaryStaff: SalaryStaff[] = [
  {
    id: 1,
    staff_name: 'Ade Admin',
    bank_code: '001',
    bank_name: 'Mock Bank',
    bank_account_number: '1234567890',
    salary_amount: 250000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const getSalarySummary = () => ({
  total_count: mockSalaryStaff.length,
  total_salary: mockSalaryStaff.reduce((sum, staff) => sum + (staff.salary_amount ?? 0), 0),
})

export const mockAffiliateOverview = {
  total_affiliates: 12,
  total_commissions: 320000,
  total_paid_out: 180000,
  pending_payouts_count: 3,
  pending_payouts_sum: 54000,
  pending_milestones: 2,
  unique_purchasers: 420,
}

export const mockAffiliateCommissions = {
  commissions: [
    {
      id: 1,
      date: new Date().toISOString(),
      affiliate: 'Ola Martins',
      order_id: 101,
      customer: 'Amina Yusuf',
      amount: 12000,
      status: 'paid',
      product_summary: '2-Step $10k',
    },
  ],
  pagination: { page: 1, per_page: 50, total: 1, total_pages: 1 },
}

export const mockAffiliatePayouts = {
  payouts: [
    {
      id: 1,
      affiliate: 'Ola Martins',
      amount: 32000,
      status: 'pending',
      bank_details: 'Mock Bank •••• 2310',
      requested_at: new Date().toISOString(),
      approved_at: null,
    },
  ],
  pagination: { page: 1, per_page: 50, total: 1, total_pages: 1 },
}

const mockAffiliateMilestones = {
  milestones: [
    {
      id: 1,
      affiliate: 'Ola Martins',
      level: 2,
      status: 'pending',
      requested_at: new Date().toISOString(),
      processed_at: null,
    },
  ],
  pagination: { page: 1, per_page: 50, total: 1, total_pages: 1 },
}

import { apiFetch } from './api'

export const adminLoginWithBackend = async (_sessionToken?: string) => apiFetch<AdminAuthMeResponse>('/admin/me')
export const fetchAdminMe = async (_sessionToken?: string) => apiFetch<AdminAuthMeResponse>('/admin/me')
export const logoutAdmin = async (_sessionToken?: string) => undefined

export const persistAdminUser = (user: AdminAuthMeResponse) => {
  persistedAdminUser = user
}

export const getPersistedAdminUser = () => persistedAdminUser

export const clearPersistedAdminUser = () => {
  persistedAdminUser = null
}

export const fetchDashboardStats = async () => apiFetch<typeof mockDashboardStats>('/admin/dashboard')

export const fetchActiveChallengeAccounts = async () =>
  apiFetch<{ accounts: ChallengeAccountListItem[] }>('/admin/challenges/active')
export const fetchChallengeAccounts = async () => ({ accounts: mockChallengeAccounts })
export const fetchFundedChallengeAccounts = async () =>
  apiFetch<{ accounts: ChallengeAccountListItem[] }>('/admin/challenges/funded')
export const fetchProfitableFundedAccounts = async () =>
  apiFetch<{ accounts: ChallengeAccountListItem[] }>('/admin/challenges/funded/top')
export const fetchBreachedChallengeAccounts = async () =>
  apiFetch<{ accounts: ChallengeBreachListItem[] }>('/admin/challenges/breaches')
export const fetchAwaitingNextStageAccounts = async () =>
  apiFetch<{ accounts: MT5Account[] }>(
    '/admin/ctrader/accounts?status=awaiting-next-stage'
  )

export const fetchAdminUsers = async () => apiFetch<typeof mockAdminUsers>('/admin/users')
export const fetchAdminKycProfiles = async () =>
  apiFetch<{ profiles: AdminKycProfileItem[]; stats: { eligible_profiles: number; today_eligible: number } }>(
    '/admin/kyc/profiles'
  )

export const fetchAdminBankList = async () => apiFetch<{ banks: { bank_code: string; bank_name: string }[] }>('/kyc/banks')

export const fetchAdminKycRequests = async (page: number = 1, limit: number = 20) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  return apiFetch<AdminKycRequestResponse>(`/admin/kyc/requests?${params.toString()}`)
}

export const reviewKycRequest = async (requestId: number, payload: { action: 'approve' | 'decline'; decline_reason?: string; admin_name?: string }) =>
  apiFetch<{ id: number; status: string; message: string }>(`/admin/kyc/requests/${requestId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const fetchOrderStats = async (period: 'today' | 'week' | 'month' = 'today') => {
  const params = new URLSearchParams()
  params.set('period', period)
  return apiFetch<typeof mockOrderStats>(`/admin/orders/stats?${params.toString()}`)
}
export const fetchOrders = async (
  page: number = 1,
  pageSize: number = 10,
  period?: 'today' | 'week' | 'month',
  status?: string,
  searchEmail?: string
) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(pageSize))
  if (period) params.set('period', period)
  if (status) params.set('status', status)
  if (searchEmail) params.set('searchEmail', searchEmail)
  return apiFetch<typeof mockOrders>(`/admin/orders?${params.toString()}`)
}
export const fetchPendingAssignments = async () =>
  apiFetch<{ orders: Order[] }>('/admin/orders/pending-assign')
export const queryOrderStatus = async (orderId: number) => ({ order_id: orderId, provider_order_id: `ORD-${orderId}`, status: 'paid', previous_status: 'pending' })
export const approveCryptoOrder = async (orderId: number) => apiFetch<{ id: number; status: string; message: string }>(`/admin/orders/${orderId}/approve`, { method: 'POST' })
export const declineCryptoOrder = async (orderId: number) => apiFetch<{ id: number; status: string; message: string }>(`/admin/orders/${orderId}/decline`, { method: 'POST' })
export const queryPendingOrders = async () => ({ total_checked: 1, updated: 1, failed: 0, orders: [] })

export const fetchPayoutStats = async (period: 'today' | 'week' | 'month' = 'today') => ({ ...mockPayoutStats, period })
export const fetchPayoutRequests = async (page: number = 1, limit: number = 50, _period?: 'today' | 'week' | 'month') => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  return apiFetch<{ payouts: PayoutRequest[]; pagination: { page: number; limit: number; total: number; pages: number }; stats?: PayoutStats }>(
    `/payouts/admin/requests?${params.toString()}`
  )
}
export const approvePayout = async (payoutId: number) =>
  apiFetch<{ id: number; status: string; message: string }>(`/payouts/admin/requests/${payoutId}/approve`, { method: 'POST' })
export const rejectPayout = async (payoutId: number, reason: string) =>
  apiFetch<{ id: number; status: string; message: string }>(`/payouts/admin/requests/${payoutId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })

export const fetchSupportTickets = async (status?: 'open' | 'closed') => {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  const query = params.toString()
  return apiFetch<SupportTicket[]>(`/support/admin/tickets${query ? `?${query}` : ''}`)
}
export const fetchSupportChat = async (chatId: string) =>
  apiFetch<SupportChat>(`/support/admin/tickets/${encodeURIComponent(chatId)}`)
export const assignSupportChat = async (chatId: string, adminName: string) =>
  apiFetch<{ message: string }>(`/support/admin/tickets/${encodeURIComponent(chatId)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assigned_to: adminName }),
  })
export const sendSupportMessage = async (chatId: string, message: string, adminName: string) =>
  apiFetch<SupportChat>(`/support/admin/tickets/${encodeURIComponent(chatId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, admin_name: adminName }),
  })
export const closeSupportChat = async (chatId: string) =>
  apiFetch<{ message: string }>(`/support/admin/tickets/${encodeURIComponent(chatId)}/close`, { method: 'POST' })
export const markSupportChatAsRead = async (chatId: string) =>
  apiFetch<{ message: string }>(`/support/admin/tickets/${encodeURIComponent(chatId)}/read`, { method: 'POST' })

export const fetchAdminAllowlist = async () => ({ admins: mockAllowlist })
export const createAdminAllowlistEntry = async (payload: { email: string; full_name?: string; role: 'admin' | 'super_admin'; require_mfa?: boolean; allowed_pages?: string[]; can_assign_mt5?: boolean }) => {
  const newEntry = {
    id: Math.floor(Math.random() * 9999),
    email: payload.email,
    full_name: payload.full_name ?? null,
    descope_user_id: null,
    role: payload.role,
    status: 'active',
    require_mfa: payload.require_mfa ?? false,
    mfa_enrolled: false,
    allowed_pages: payload.allowed_pages ?? [],
    created_by_user_id: mockAdminUser.id,
    can_assign_mt5: payload.can_assign_mt5 ?? false,
  }
  mockAllowlist = [...mockAllowlist, newEntry]
  return newEntry
}
export const updateAdminAllowlistEntry = async (entryId: number, payload: { full_name?: string; role?: 'admin' | 'super_admin'; status?: 'active' | 'disabled'; require_mfa?: boolean; allowed_pages?: string[]; can_assign_mt5?: boolean }) => {
  const entryIndex = mockAllowlist.findIndex((entry) => entry.id === entryId)
  const existing = mockAllowlist[entryIndex] ?? mockAllowlist[0]
  const updated = { ...existing, ...payload }
  mockAllowlist = mockAllowlist.map((entry) => (entry.id === entryId ? updated : entry))
  return updated
}
export const deleteAdminAllowlistEntry = async (entryId: number) => {
  mockAllowlist = mockAllowlist.filter((entry) => entry.id !== entryId)
}

export const sendAnnouncement = async (_payload: { subject: string; message: string }) => ({ message: 'Announcement sent (mock).', recipient_count: 128 })
export const sendTestAnnouncement = async (_payload: { subject: string; message: string }) => ({ message: 'Test announcement sent (mock).', recipient_count: 1 })

export const fetchMonthlyFinanceStats = async () => mockMonthlyFinance

export const fetchAdminCoupons = async () => apiFetch<{ coupons: AdminCoupon[] }>('/admin/coupons')
export const createAdminCoupon = async (payload: { code: string; discount_type: 'percent' | 'fixed'; discount_value: number; max_uses?: number | null; expires_at?: string | null; apply_all_plans: boolean; applicable_plan_ids: string[] }) =>
  apiFetch<AdminCoupon>('/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
export const updateAdminCouponStatus = async (couponId: number, isActive: boolean) =>
  apiFetch<AdminCoupon>(`/admin/coupons/${couponId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  })
export const toggleAdminCouponPlan = async (couponId: number, payload: { plan_id: string; enabled: boolean }) =>
  apiFetch<AdminCoupon>(`/admin/coupons/${couponId}/plans`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const fetchMT5Accounts = async (status?: string) =>
  apiFetch<{ accounts: MT5Account[] }>(
    status ? `/admin/ctrader/accounts?status=${encodeURIComponent(status)}` : '/admin/ctrader/accounts'
  )
export const fetchAssignedMT5Accounts = async () =>
  apiFetch<{ accounts: MT5Account[] }>(
    '/admin/ctrader/accounts'
  )
export const fetchMT5Summary = async () => apiFetch<{ total: number; ready: number; assigned: number; disabled: number }>(
  '/admin/ctrader/summary'
)
export const fetchNextChallengeId = async () => ({ challenge_id: `CH-${Math.floor(Math.random() * 9999)}` })
export const assignMT5Account = async (accountId: number, payload: { stage: 'Phase 1' | 'Phase 2' | 'Funded'; assigned_user_email: string; challenge_id?: string }) => ({
  id: accountId,
  server: 'MT5-Live-01',
  account_number: '100110',
  password: '••••••',
  investor_password: '••••••',
  account_size: '$10k',
  status: payload.stage,
  assignment_mode: payload.challenge_id ? 'manual' : 'automatic',
  assigned_by_admin_name: mockAdminUser.full_name,
  assigned_user_id: 1001,
  assigned_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
export const downloadMT5Template = async () => 'account_number,broker,account_size,status\n100110,ICMarkets,$10,000,Ready'
type UploadedCTraderAccount = {
  account_number: string
  broker: string
  account_size: string
  status?: string
}

const parseUploadLines = (content: string): UploadedCTraderAccount[] => {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return []

  const headerTokens = lines[0]?.toLowerCase().replace(/\s+/g, '') ?? ''
  const hasHeader = headerTokens.includes('accountnumber') || headerTokens.includes('broker')

  const dataLines = hasHeader ? lines.slice(1) : lines
  return dataLines.map((line) => {
    const delimiter = line.includes('\t') ? '\t' : ','
    const parts = line.split(delimiter).map((value) => value.trim()).filter((value) => value.length > 0)
    const accountNumber = parts[0] ?? ''
    const broker = parts[1] ?? ''
    const status = parts.length > 3 ? parts[parts.length - 1] : 'Ready'
    const accountSizeParts = parts.length > 3 ? parts.slice(2, -1) : parts.slice(2)
    const accountSize = accountSizeParts.join(delimiter).trim()
    return {
      account_number: accountNumber,
      broker,
      account_size: accountSize,
      status: status || 'Ready',
    }
  })
}

export const uploadMT5AccountsTxt = async (content: string) => {
  const accounts = parseUploadLines(content)
  if (!accounts.length) {
    throw new Error('No valid accounts found in uploaded file.')
  }
  return apiFetch<{ count: number; accounts: unknown[] }>('/admin/ctrader/accounts/upload', {
    method: 'POST',
    body: JSON.stringify({ accounts }),
  })
}
export const deleteMT5Account = async (accountId: number) =>
  apiFetch<{ message: string; id: number }>(`/admin/ctrader/accounts/${accountId}`, {
    method: 'DELETE',
  })
export const generateCertificates = async () => ({ message: 'Mock certificates generated', generated: 3, failed: 0 })
export const generatePayoutCertificates = async () => ({ message: 'Mock payout certificates generated', generated: 2, failed: 0 })

export const fetchAdminChallengeConfig = async () => ({ plans: [] })
export const updateAdminChallengeConfig = async (payload: { otp: string; plans: ChallengePlanConfig[] }) => ({ plans: payload.plans })
export const sendAdminChallengeConfigOtp = async () => ({ message: 'OTP sent (mock).' })
export const fetchAdminPayoutConfig = async () => ({ auto_approval_threshold_percent: 30 })
export const updateAdminPayoutConfig = async (payload: { otp: string; auto_approval_threshold_percent: number }) => ({ auto_approval_threshold_percent: payload.auto_approval_threshold_percent })
export const fetchAdminHeroStats = async () => ({ stats: { total_paid_out: '$120m', paid_this_month: '$14.8m', paid_today: '$620k', trusted_traders: '2,840' } })
export const updateAdminHeroStats = async (payload: { otp: string; stats: any }) => ({ stats: payload.stats })
export const fetchTradingObjectives = async () => apiFetch<TradingObjectivesResponse>('/trading-objectives')
export const updateTradingObjectives = async (payload: { rules: TradingObjectivesConfig }) =>
  apiFetch<TradingObjectivesResponse>('/trading-objectives', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const fetchAffiliateOverview = async () => apiFetch<AffiliateOverviewStats>('/admin/affiliate/overview')
export const fetchAffiliateCommissions = async (page: number = 1, perPage: number = 50) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(perPage))
  return apiFetch<{ commissions: AffiliateCommission[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/admin/affiliate/commissions?${params.toString()}`
  )
}
export const fetchAffiliatePayouts = async (page: number = 1, perPage: number = 50) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(perPage))
  return apiFetch<{ payouts: AffiliatePayout[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/admin/affiliate/payouts?${params.toString()}`
  )
}
export const fetchAffiliateMilestones = async (page: number = 1, perPage: number = 50) => ({ ...mockAffiliateMilestones, pagination: { ...mockAffiliateMilestones.pagination, page, per_page: perPage } })
export const approveAffiliatePayout = async (payoutId: number) =>
  apiFetch<{ message: string; status: string }>(`/admin/affiliate/payouts/${payoutId}/approve`, { method: 'POST' })
export const rejectAffiliatePayout = async (payoutId: number, reason?: string) =>
  apiFetch<{ message: string; status: string }>(`/admin/affiliate/payouts/${payoutId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
export const approveAffiliateMilestone = async (_milestoneId: number) => ({ message: 'Affiliate milestone approved (mock).' })
export const rejectAffiliateMilestone = async (_milestoneId: number, _reason?: string) => ({ message: 'Affiliate milestone rejected (mock).' })

export const fetchUserProfile = async (userId: number) => ({
  user_id: userId,
  name: 'Amina Yusuf',
  email: 'amina@machefunded.com',
  status: 'active',
  kyc_status: 'pending',
  trading: 'Challenge Active',
  accounts: '2 / 0',
  revenue: '$220k',
  orders: '3',
  payouts: '$0',
})
export const fetchUserChallengeAccounts = async (_userId: number) => mockChallengeAccounts
export const fetchUserOrders = async (_userId: number) => ({ orders: mockOrders.orders, pagination: mockOrders.pagination })
export const fetchUserPayouts = async (_userId: number) => ({ payouts: mockPayoutRequests.payouts, pagination: mockPayoutRequests.pagination })
export const fetchUserSupportTickets = async (_userId: number) =>
  apiFetch<UserSupportTicket[]>('/support/admin/tickets')
export const sendUserEmail = async (userId: number, _subject: string, _message: string) => ({ message: `Email sent to ${userId} (mock).` })
export const addUserNote = async (userId: number, _note: string) => ({ message: `Note added for ${userId} (mock).` })
export const updateUserStatus = async (userId: number, status: 'active' | 'disabled') => ({ message: `User ${userId} status updated to ${status} (mock).` })
export const disableUserWithdrawals = async (userId: number) => ({ message: `Withdrawals disabled for ${userId} (mock).` })
export const enableUserWithdrawals = async (userId: number) => ({ message: `Withdrawals enabled for ${userId} (mock).` })
export const suspendUser = async (userId: number) => ({ message: `User ${userId} suspended (mock).` })
export const unsuspendUser = async (userId: number) => ({ message: `User ${userId} unsuspended (mock).` })
export const banUser = async (userId: number) => ({ message: `User ${userId} banned (mock).` })

export const fetchSalaryBanks = async () => mockSalaryBanks
export const resolveSalaryAccountName = async (payload: { bank_code: string; bank_account_number: string }) => ({
  bank_code: payload.bank_code,
  bank_account_number: payload.bank_account_number,
  account_name: 'Mock Account Name',
})
export const fetchSalaryStaff = async () => ({ staff: mockSalaryStaff, ...getSalarySummary() })
export const createSalaryStaff = async (payload: { bank_code: string; bank_account_number: string; staff_name: string; salary_amount: number }) => {
  const newStaff = {
    id: Math.floor(Math.random() * 9999),
    staff_name: payload.staff_name,
    bank_code: payload.bank_code,
    bank_name: 'Mock Bank',
    bank_account_number: payload.bank_account_number,
    salary_amount: payload.salary_amount,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  mockSalaryStaff = [...mockSalaryStaff, newStaff]
  return newStaff
}
export const updateSalaryStaff = async (staffId: number, payload: { staff_name?: string; salary_amount?: number }) => {
  const existing = mockSalaryStaff.find((staff) => staff.id === staffId) ?? mockSalaryStaff[0]
  const updated = { ...existing, ...payload }
  mockSalaryStaff = mockSalaryStaff.map((staff) => (staff.id === staffId ? updated : staff))
  return updated
}
export const deleteSalaryStaff = async (staffId: number) => {
  mockSalaryStaff = mockSalaryStaff.filter((staff) => staff.id !== staffId)
  return { message: 'Staff deleted (mock).' }
}
export const previewSalaryDisbursement = async () => ({ summary: { total_staff: mockSalaryStaff.length, total_amount: getSalarySummary().total_salary }, staff: mockSalaryStaff })
export const sendSalaryDisbursementOtp = async () => ({ message: 'Salary OTP sent (mock).' })
export const disburseSalaries = async () => ({
  summary: { total_staff: mockSalaryStaff.length, total_amount: getSalarySummary().total_salary },
  transfers: mockSalaryStaff.map((staff) => ({
    staff_id: staff.id,
    staff_name: staff.staff_name,
    amount: staff.salary_amount,
    status: 'success',
    reference: `TX-${staff.id}`,
    message: 'Mock disbursement completed.',
  })),
})