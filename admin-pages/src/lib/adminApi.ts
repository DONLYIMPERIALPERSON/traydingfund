import { apiFetch, apiFetchText } from './api'

export type Nullable<T> = T | null

export type AdminAuthMeResponse = {
  id: number
  descope_user_id?: string | null
  email: string
  full_name: string | null
  role: string
  status?: string
  allowed_pages?: string[]
  can_assign_mt5?: boolean
}

export type AdminUsersListItem = {
  user_id: number
  name: string
  email: string
  status: string
  trading: string
  accounts: string
  revenue: string
  orders: string
  payouts: string
}

export type ChallengeAccountListItem = {
  id?: number
  challenge_id: string
  user_id?: number | null
  trader_name?: string | null
  trader_email?: string | null
  account_size: string
  currency?: string | null
  phase?: string | null
  mt5_account?: string | null
  mt5_server?: string | null
  platform?: string | null
  objective_status?: string | null
  current_pnl?: string | null
  profit?: string | null
  win_rate?: string | null
  created_at?: string | null
  assigned_at?: string | null
  passed_at?: string | null
  breached_at?: string | null
}

export type AtticAccountsSummary = {
  period: string
  total: number
  active: number
  passed: number
  breached: number
}

export type AtticAccountsResponse = {
  summary: AtticAccountsSummary
  accounts: ChallengeAccountListItem[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export type AdminLookupAccount = {
  id: number
  challenge_id: string
  account_number: string
  platform: string
  status: string
  phase: string
  account_size: string
  currency?: string | null
  trader_name?: string | null
  trader_email?: string | null
  breach_reason?: string | null
  breached_at?: string | null
  breach_event?: Record<string, unknown> | null
  trade_duration_violations?: Record<string, unknown>[] | null
  breach_balance?: number | null
  daily_breach_balance?: number | null
  daily_high_balance?: number | null
  daily_low_equity?: number | null
  min_equity?: number | null
  highest_balance?: number | null
  last_feed_at?: string | null
  breach_report_url?: string | null
}

export type AdminResetAccountResponse = {
  status: 'pending' | 'completed'
  message: string
  account_id: number
  account_number: string
}

export type AdminUpdateMt5PasswordResponse = {
  message: string
  account_id: number
  account_number: string
  mt5_login: string
  mt5_server: string | null
}

export type AdminReplaceAccountResponse = {
  message: string
  completed_account_id: number
  completed_account_number: string
  completed_challenge_id: string
  assigned_account_id: number
  assigned_account_number: string
  assigned_challenge_id: string
  assigned_phase: string
  assigned_challenge_type: string | null
  assigned_platform: string
  assigned_status: string
}

export type ChallengeBreachListItem = {
  challenge_id: string
  user_id?: number | null
  trader_name?: string | null
  trader_email?: string | null
  account_size: string
  currency?: string | null
  phase?: string | null
  mt5_account?: string | null
  breach_reason?: string | null
  breached_at?: string | null
}

export type MT5Account = {
  id: number
  account_number: string
  server: string
  account_size: string
  currency?: string | null
  challenge_type?: string | null
  status: string
  phase?: string | null
  challenge_id?: string | null
  assigned_user_id?: number | null
  assigned_user_email?: string | null
  assigned_at?: string | null
  assignment_mode?: string | null
  assigned_by_admin_name?: string | null
  access_status?: string | null
  platform?: string | null
  mt5_login?: string | null
  mt5_server?: string | null
  mt5_password?: string | null
}

export type Order = {
  id: number
  provider_order_id: string
  status: string
  assignment_status: string
  account_size: string
  currency?: string | null
  challenge_type?: string | null
  phase?: string | null
  platform?: string | null
  ready_matches?: number
  net_amount_formatted: string
  created_at: string
  paid_at: string | null
  payment_method?: string
  payment_provider?: string
  crypto_currency?: string | null
  crypto_address?: string | null
  user: { id: string; name: string; email: string }
}

export type OrderStats = {
  period: string
  total_orders: number
  paid_orders?: number
  pending_orders?: number
  failed_orders?: number
  total_volume_formatted: string
  success_rate_formatted?: string
}

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

export type AdminAllowlistEntry = {
  id: number
  email: string
  full_name: string | null
  descope_user_id?: string | null
  role: 'admin' | 'super_admin'
  status: 'active' | 'disabled'
  require_mfa?: boolean
  mfa_enrolled?: boolean
  allowed_pages: string[]
  created_by_user_id?: number
  can_assign_mt5?: boolean
}

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

export type AffiliateOverviewStats = {
  total_affiliates: number
  total_commissions: number
  total_paid_out: number
  pending_payouts_count: number
  pending_payouts_sum: number
  pending_milestones: number
  unique_purchasers: number
}

export type AffiliateCommission = {
  id: number
  date: string
  affiliate: string
  order_id: number
  customer: string
  amount: number
  status: string
  product_summary?: string | null
}

export type AffiliatePayout = {
  id: number
  affiliate: string
  amount: number
  status: string
  bank_details: string
  payout_method_type?: string | null
  payout_bank_name?: string | null
  payout_bank_code?: string | null
  payout_account_number?: string | null
  payout_account_name?: string | null
  payout_crypto_currency?: string | null
  payout_crypto_address?: string | null
  payout_crypto_first_name?: string | null
  payout_crypto_last_name?: string | null
  amount_usd?: number | null
  amount_ngn?: number | null
  usd_ngn_rate?: number | null
  requested_at: string
  approved_at: string | null
}

export type TradingObjectivesConfig = {
  challenge_types: Array<{
    key: string
    label: string
    phases: Array<{
      key: string
      label: string
      rules: Array<{ key: string; label: string; value: string }>
    }>
  }>
}

export type TradingObjectivesResponse = {
  rules: TradingObjectivesConfig
}

export type AdminCoupon = {
  id: number
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  is_active: boolean
  expires_at: string | null
  max_uses: number | null
  used_count: number
  applicable_plan_ids: string[]
  applies_to_all_plans: boolean
  applicable_challenge_types: string[]
  applies_to_all_challenge_types: boolean
  status: string
}

export type ChallengePlanConfig = {
  id: string
  name: string
  price?: number
  account_size?: string
  currency?: string
  max_drawdown?: string | number
  profit_target?: string | number
  phases?: string | string[]
  min_trading_days?: number
  profit_split?: string | number
  profit_cap?: string | number
  payout_frequency?: string
  status?: string
  enabled?: boolean
  challenge_type?: string
  phase?: string
}

export type SalaryBank = {
  bank_code: string
  bank_name: string
}

export type SalaryStaff = {
  id: number
  staff_name: string
  bank_name: string
  bank_code: string
  bank_account_number: string
  salary_amount: number
}

export type SalaryDisbursementPreview = {
  summary: {
    total_amount: number
    total_staff: number
  }
  staff: SalaryStaff[]
}

export type SalaryDisbursementResponse = {
  message?: string
  transfers: Array<{
    staff_id: number
    staff_name: string
    amount: number
    status: 'success' | 'failed'
    reference?: string | null
    message?: string | null
  }>
}

export type SendAnnouncementResponse = {
  message: string
  recipient_count?: number
}

export type SupportMessage = {
  id: string
  chat_id: string
  sender: 'user' | 'support'
  message: string | null
  image_url: string | null
  created_at: string
  is_read: boolean
}

export type SupportChat = {
  id: string
  user_id: number
  subject: string
  status: 'open' | 'closed'
  priority: 'low' | 'medium' | 'high'
  assigned_to: string | null
  created_at: string
  updated_at: string
  last_message: string | null
  unread_count: number
  user_unread_count: number
  messages: SupportMessage[]
}

export type SupportTicket = {
  id: string
  subject: string
  status: 'open' | 'closed'
  priority: 'low' | 'medium' | 'high'
  assigned_to: string | null
  user_name: string
  user_email: string
  created_at: string
  updated_at: string
  last_message: string | null
  unread_count: number
  user_unread_count: number
}

export type UserProfileData = {
  status?: string
  accounts?: string
  revenue?: string
  payouts?: string
  orders?: string
  trading?: string
  kyc_status?: string
  bank_account?: {
    account_name?: string
    bank_name?: string
    bank_code?: string
    bank_account_number?: string
    is_verified?: boolean
    verified_at?: string | null
  }
}

export type UserChallengeAccount = {
  challenge_id: string
  mt5_account?: string | null
  account_size: string
  phase?: string | null
  assigned_at?: string | null
  objective_status?: string | null
}

export type UserOrder = {
  id: number
  provider_order_id: string
  account_size: string
  net_amount_formatted: string
  status: string
  created_at?: string | null
}

export type UserPayout = {
  id: number
  amount_formatted: string
  status: string
  created_at?: string | null
  account: { challenge_id: string | null }
}

export type UserSupportTicket = {
  id: string
  subject: string
  priority: string
  status: string
  updated_at: string
  user_name: string
  user_email: string
}

export type AccountRecoveryRequestItem = {
  id: number
  user_id: number
  user_name?: string | null
  user_email?: string | null
  email: string
  account_number: string
  platform: string
  broker_name?: string | null
  mt5_login?: string | null
  mt5_server?: string | null
  phase: string
  account_type: string
  account_size: string
  status: string
  review_note: string | null
  decline_reason: string | null
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  recovered_account_id: number | null
}

export const adminLoginWithBackend = async (_sessionToken?: string) =>
  apiFetch<AdminAuthMeResponse>('/admin/me')

export const fetchAdminMe = async (_sessionToken?: string) =>
  apiFetch<AdminAuthMeResponse>('/admin/me')

export const logoutAdmin = async (_sessionToken?: string) => {
  localStorage.removeItem('supabase_access_token')
}

let persistedAdminUser: Nullable<AdminAuthMeResponse> = null

export const persistAdminUser = (user: AdminAuthMeResponse) => {
  persistedAdminUser = user
}

export const getPersistedAdminUser = () => persistedAdminUser

export const clearPersistedAdminUser = () => {
  persistedAdminUser = null
}

export const fetchDashboardStats = async () =>
  apiFetch<any>('/admin/dashboard')

export const fetchActiveChallengeAccounts = async (platform?: string) =>
  apiFetch<{ accounts: ChallengeAccountListItem[] }>(
    platform ? `/admin/challenges/active?platform=${encodeURIComponent(platform)}` : '/admin/challenges/active'
  )

export const fetchAtticChallengeAccounts = async (
  page: number = 1,
  limit: number = 10,
  period: 'today' | 'week' | 'month' = 'today',
  search?: string,
) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  params.set('period', period)
  if (search?.trim()) params.set('search', search.trim())
  return apiFetch<AtticAccountsResponse>(`/admin/challenges/attic?${params.toString()}`)
}

export const adminResetAccount = async (payload: { account_id?: number; account_number?: string }) =>
  apiFetch<AdminResetAccountResponse>('/admin/ctrader/accounts/reset', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const adminUpdateMt5Password = async (payload: { account_id?: number; account_number?: string; mt5_password: string }) =>
  apiFetch<AdminUpdateMt5PasswordResponse>('/admin/ctrader/accounts/update-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const adminReplaceAccount = async (payload: { account_id?: number; account_number?: string; platform: 'mt5' | 'ctrader'; next_phase?: boolean }) =>
  apiFetch<AdminReplaceAccountResponse>('/admin/ctrader/accounts/replace', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const lookupChallengeAccount = async (accountNumber: string) =>
  apiFetch<{ account: AdminLookupAccount }>(
    `/admin/challenges/lookup?account_number=${encodeURIComponent(accountNumber)}`
  )

export const fetchFundedChallengeAccounts = async (platform?: string) =>
  apiFetch<{ accounts: ChallengeAccountListItem[] }>(
    platform ? `/admin/challenges/funded?platform=${encodeURIComponent(platform)}` : '/admin/challenges/funded'
  )

export const fetchProfitableFundedAccounts = async (platform?: string) =>
  apiFetch<{ accounts: ChallengeAccountListItem[] }>(
    platform ? `/admin/challenges/funded/top?platform=${encodeURIComponent(platform)}` : '/admin/challenges/funded/top'
  )

export const fetchBreachedChallengeAccounts = async () =>
  apiFetch<{ accounts: ChallengeBreachListItem[] }>('/admin/challenges/breaches')

export const fetchAdminUsers = async () =>
  apiFetch<{ users: AdminUsersListItem[]; stats: { total_users: number; funded_users: number; breached_users: number } }>('/admin/users')

export const fetchAccountRecoveryRequests = async () =>
  apiFetch<{ requests: AccountRecoveryRequestItem[] }>('/account-recovery/admin')

export const reviewAccountRecoveryRequest = async (requestId: number, payload: {
  action: 'approve' | 'decline'
  review_note?: string
  decline_reason?: string
  platform?: 'ctrader' | 'mt5'
  broker_name?: string
  mt5_server?: 'Exness-MT5Trial9' | 'Exness-MT5Trial10'
  mt5_password?: string
}) =>
  apiFetch<{ message: string; request: AccountRecoveryRequestItem }>(`/account-recovery/admin/${requestId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const fetchAdminKycProfiles = async () =>
  apiFetch<{ profiles: AdminKycProfileItem[]; stats: { eligible_profiles: number; today_eligible: number } }>('/admin/kyc/profiles')

export const fetchAdminBankList = async () =>
  apiFetch<{ banks: { bank_code: string; bank_name: string }[] }>('/kyc/banks')

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
  return apiFetch<OrderStats>(`/admin/orders/stats?${params.toString()}`)
}

export const fetchOrders = async (
  page: number = 1,
  pageSize: number = 10,
  period?: 'today' | 'week' | 'month',
  status?: string,
  searchEmail?: string,
) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(pageSize))
  if (period) params.set('period', period)
  if (status) params.set('status', status)
  if (searchEmail) params.set('searchEmail', searchEmail)
  return apiFetch<{ orders: Order[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/admin/orders?${params.toString()}`)
}

export const fetchPendingAssignments = async () =>
  apiFetch<{ orders: Order[] }>('/admin/orders/pending-assign')

export const retryPendingAssignments = async () =>
  apiFetch<{ message: string; total: number; assigned: number; skipped: Array<{ orderId: number; providerOrderId: string | null; reason: string }> }>(
    '/admin/orders/pending-assign/retry',
    {
      method: 'POST',
    },
  )

export const approveCryptoOrder = async (orderId: number) =>
  apiFetch<{ id: number; status: string; message: string }>(`/admin/orders/${orderId}/approve`, { method: 'POST' })

export const declineCryptoOrder = async (orderId: number) =>
  apiFetch<{ id: number; status: string; message: string }>(`/admin/orders/${orderId}/decline`, { method: 'POST' })

export const fetchPayoutRequests = async (page: number = 1, limit: number = 50, _period?: 'today' | 'week' | 'month') => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  return apiFetch<{ payouts: PayoutRequest[]; pagination: { page: number; limit: number; total: number; pages: number }; stats?: PayoutStats }>(
    `/payouts/admin/requests?${params.toString()}`,
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

export const fetchAdminAllowlist = async () =>
  apiFetch<{ admins: AdminAllowlistEntry[] }>('/admin/allowlist')

export const createAdminAllowlistEntry = async (payload: { email: string; full_name?: string; role: 'admin' | 'super_admin'; require_mfa?: boolean; allowed_pages?: string[]; can_assign_mt5?: boolean }) =>
  apiFetch<AdminAllowlistEntry>('/admin/allowlist', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateAdminAllowlistEntry = async (entryId: number, payload: { full_name?: string; role?: 'admin' | 'super_admin'; status?: 'active' | 'disabled'; require_mfa?: boolean; allowed_pages?: string[]; can_assign_mt5?: boolean }) =>
  apiFetch<AdminAllowlistEntry>(`/admin/allowlist/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteAdminAllowlistEntry = async (entryId: number) =>
  apiFetch<{ message: string }>(`/admin/allowlist/${entryId}`, { method: 'DELETE' })

export const fetchAdminCoupons = async () =>
  apiFetch<{ coupons: AdminCoupon[] }>('/admin/coupons')

export const fetchAdminChallengeConfig = async () =>
  apiFetch<{ plans: ChallengePlanConfig[] }>('/public/plans')

export const createAdminCoupon = async (payload: { code: string; discount_type: 'percent' | 'fixed'; discount_value: number; max_uses?: number | null; expires_at?: string | null; apply_all_plans: boolean; applicable_plan_ids: string[]; apply_all_challenge_types: boolean; applicable_challenge_types: string[] }) =>
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

export const toggleAdminCouponChallengeType = async (
  couponId: number,
  payload: { challenge_type: string; enabled: boolean }
) => apiFetch<AdminCoupon>(`/admin/coupons/${couponId}/challenge-types`, {
  method: 'PATCH',
  body: JSON.stringify(payload),
})

export const deleteAdminCoupon = async (couponId: number) =>
  apiFetch<AdminCoupon>(`/admin/coupons/${couponId}`, {
    method: 'DELETE',
  })

export const fetchMT5Accounts = async (status?: string, platform?: string) => {
  const params = new URLSearchParams()
  if (status) {
    params.set('status', status)
  }
  if (platform) {
    params.set('platform', platform)
  }
  const suffix = params.toString()
  return apiFetch<{ accounts: MT5Account[] }>(
    suffix ? `/admin/ctrader/accounts?${suffix}` : '/admin/ctrader/accounts',
  )
}

export const fetchAssignedMT5Accounts = async (platform?: string) => {
  const suffix = platform ? `?platform=${encodeURIComponent(platform)}` : ''
  return apiFetch<{ accounts: MT5Account[] }>(`/admin/ctrader/accounts${suffix}`)
}

export const fetchMT5Summary = async () =>
  apiFetch<{ total: number; ready: number; assigned: number; disabled: number; ctrader: { total: number; ready: number; assigned: number; disabled: number }; mt5: { total: number; ready: number; assigned: number; disabled: number } }>(
    '/admin/ctrader/summary',
  )

export const fetchAwaitingNextStageAccounts = async (platform?: string) => {
  const params = new URLSearchParams({ status: 'awaiting-next-stage' })
  if (platform) {
    params.set('platform', platform)
  }
  return apiFetch<{ accounts: MT5Account[] }>(
    `/admin/ctrader/accounts?${params.toString()}`,
  )
}

export const forceAssignNextStage = async (accountId: number) =>
  apiFetch<{ message: string; assigned_challenge_id: string; assigned_account_number: string }>(
    '/admin/ctrader/accounts/force-next-stage',
    {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId }),
    },
  )

export const fetchNextChallengeId = async () =>
  apiFetch<{ challenge_id: string }>('/admin/ctrader/next-challenge-id')

export const assignMT5Account = async (
  accountId: number,
  payload: { stage: 'Phase 1' | 'Phase 2' | 'Funded'; assigned_user_email: string; challenge_id?: string },
) =>
  apiFetch<{ message?: string }>(`/admin/ctrader/accounts/${accountId}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const downloadMT5Template = async () =>
  apiFetchText('/admin/ctrader/accounts/template')

export const logCTraderCredentialView = async (payload: {
  account_id?: number
  account_number?: string
  platform: string
  scope?: string
}) =>
  apiFetch<{ status: string }>('/admin/ctrader/accounts/credential-views', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

const parseCsvLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

const parseUploadLines = (content: string): Array<{
  account_number: string
  broker: string
  account_size: string
  currency?: string
  status?: string
  platform?: string
  mt5_login?: string
  mt5_server?: string
  mt5_password?: string
}> => {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return []

  const headerLine = lines[0] ?? ''
  const headerTokens = headerLine.toLowerCase().replace(/\s+/g, '')
  const hasHeader = headerTokens.includes('accountnumber') || headerTokens.includes('broker')

  const headerDelimiter = headerLine.includes('\t') ? '\t' : ','
  const headerParts = hasHeader
    ? (headerDelimiter === '\t'
      ? headerLine.split(headerDelimiter).map((value) => value.trim().toLowerCase())
      : parseCsvLine(headerLine).map((value) => value.trim().toLowerCase()))
    : []

  const getHeaderIndex = (candidates: string[]) =>
    headerParts.findIndex((part) => candidates.includes(part.replace(/\s+/g, '')))

  const accountIndex = getHeaderIndex(['accountnumber', 'account_number'])
  const brokerIndex = getHeaderIndex(['broker'])
  const sizeIndex = getHeaderIndex(['accountsize', 'account_size', 'size'])
  const currencyIndex = getHeaderIndex(['currency'])
  const statusIndex = getHeaderIndex(['status'])
  const platformIndex = getHeaderIndex(['platform'])
  const mt5LoginIndex = getHeaderIndex(['mt5login', 'mt5_login', 'login'])
  const mt5ServerIndex = getHeaderIndex(['mt5server', 'mt5_server', 'server'])
  const mt5PasswordIndex = getHeaderIndex(['mt5password', 'mt5_password', 'password'])

  const dataLines = hasHeader ? lines.slice(1) : lines
  return dataLines.map((line) => {
    const delimiter = line.includes('\t') ? '\t' : ','
    const parts = delimiter === '\t'
      ? line.split(delimiter).map((value) => value.trim())
      : parseCsvLine(line)

    if (hasHeader) {
      const safeIndex = (index: number) => (index >= 0 ? index : undefined)
      const sizeStart = safeIndex(sizeIndex) ?? 2
      const sizeEnd = safeIndex(currencyIndex) ?? safeIndex(statusIndex) ?? parts.length
      const accountSizeParts = parts.slice(sizeStart, sizeEnd).filter((part) => part.length > 0)
      const currencyValue = safeIndex(currencyIndex) !== undefined ? parts[currencyIndex] : undefined
      const statusValue = safeIndex(statusIndex) !== undefined ? parts[statusIndex] : undefined
      const platformValue = safeIndex(platformIndex) !== undefined ? parts[platformIndex] : undefined
      const mt5LoginValue = safeIndex(mt5LoginIndex) !== undefined ? parts[mt5LoginIndex] : undefined
      const mt5ServerValue = safeIndex(mt5ServerIndex) !== undefined ? parts[mt5ServerIndex] : undefined
      const mt5PasswordValue = safeIndex(mt5PasswordIndex) !== undefined ? parts[mt5PasswordIndex] : undefined

      const accountNumber = parts[accountIndex] ?? ''
      const platform = (platformValue || '').toLowerCase()
      const resolvedLogin = platform === 'mt5'
        ? (mt5LoginValue || accountNumber)
        : mt5LoginValue
      return {
        account_number: accountNumber,
        broker: parts[brokerIndex] ?? '',
        account_size: accountSizeParts.join(delimiter).trim(),
        currency: currencyValue || undefined,
        status: statusValue || 'Ready',
        platform: platformValue || undefined,
        mt5_login: resolvedLogin || undefined,
        mt5_server: mt5ServerValue || undefined,
        mt5_password: mt5PasswordValue || undefined,
      }
    }

    const accountNumber = parts[0] ?? ''
    const broker = parts[1] ?? ''

    if (parts.length >= 9) {
      const platform = (parts[5] || '').toLowerCase()
      const resolvedLogin = platform === 'mt5'
        ? (parts[6] || accountNumber)
        : parts[6]
      return {
        account_number: accountNumber,
        broker,
        account_size: parts[2] ?? '',
        currency: parts[3] || undefined,
        status: parts[4] || 'Ready',
        platform: parts[5] || undefined,
        mt5_login: resolvedLogin || undefined,
        mt5_server: parts[7] || undefined,
        mt5_password: parts[8] || undefined,
      }
    }

    let status = 'Ready'
    let currency: string | undefined
    let sizeParts = parts.slice(2)

    const lastPart = parts[parts.length - 1]
    const secondLastPart = parts[parts.length - 2]
    const normalizedStatus = (lastPart ?? '').toLowerCase()
    const knownStatuses = new Set(['ready', 'assigned', 'disabled', 'active', 'funded', 'pending'])
    if (knownStatuses.has(normalizedStatus)) {
      status = lastPart
      sizeParts = parts.slice(2, -1)
    }

    const normalizedCurrency = (secondLastPart ?? '').toUpperCase()
    const knownCurrencies = new Set(['USD', 'NGN', 'EUR', 'GBP'])
    if (knownCurrencies.has(normalizedCurrency)) {
      currency = secondLastPart
      sizeParts = status !== 'Ready' ? parts.slice(2, -2) : parts.slice(2, -1)
    }

    const accountSize = sizeParts.filter((part) => part.length > 0).join(delimiter).trim()

    return {
      account_number: accountNumber,
      broker,
      account_size: accountSize,
      currency,
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

export const fetchTradingObjectives = async () =>
  apiFetch<TradingObjectivesResponse>('/trading-objectives')

export const updateTradingObjectives = async (payload: { rules: TradingObjectivesConfig }) =>
  apiFetch<TradingObjectivesResponse>('/trading-objectives', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const fetchAffiliateOverview = async () =>
  apiFetch<AffiliateOverviewStats>('/admin/affiliate/overview')

export const fetchAffiliateCommissions = async (page: number = 1, perPage: number = 50) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(perPage))
  return apiFetch<{ commissions: AffiliateCommission[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/admin/affiliate/commissions?${params.toString()}`,
  )
}

export const fetchAffiliatePayouts = async (page: number = 1, perPage: number = 50) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(perPage))
  return apiFetch<{ payouts: AffiliatePayout[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/admin/affiliate/payouts?${params.toString()}`,
  )
}

export const approveAffiliatePayout = async (payoutId: number) =>
  apiFetch<{ message: string; status: string }>(`/admin/affiliate/payouts/${payoutId}/approve`, { method: 'POST' })

export const rejectAffiliatePayout = async (payoutId: number, reason?: string, deductCommission?: boolean) =>
  apiFetch<{ message: string; status: string }>(`/admin/affiliate/payouts/${payoutId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason, deductCommission }),
  })

export const fetchPayoutStats = async (period: 'today' | 'week' | 'month' = 'today') => {
  const params = new URLSearchParams()
  params.set('period', period)
  return apiFetch<PayoutStats>(`/payouts/admin/requests?${params.toString()}`).then((data: any) => data.stats ?? data)
}

export const generatePayoutCertificates = async () =>
  apiFetch<{ generated: number; failed: number; message: string }>('/payouts/admin/certificates', {
    method: 'POST',
  })

export const fetchMonthlyFinanceStats = async () =>
  apiFetch<{ monthlyFinance: Array<{ month: string; totalPurchase: string; totalPayouts: string }> }>(
    '/admin/finance/monthly',
  )

export const fetchSalaryBanks = async () =>
  apiFetch<{ banks: SalaryBank[] }>('/admin/salaries/banks')

export const fetchSalaryStaff = async () =>
  apiFetch<{ staff: SalaryStaff[]; total_salary: number }>('/admin/salaries/staff')

export const resolveSalaryAccountName = async (payload: { bank_code: string; bank_account_number: string }) =>
  apiFetch<{ account_name: string }>('/admin/salaries/resolve-account', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const createSalaryStaff = async (payload: { bank_code: string; bank_account_number: string; staff_name: string; salary_amount: number }) =>
  apiFetch<SalaryStaff>('/admin/salaries/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateSalaryStaff = async (staffId: number, payload: { staff_name: string; salary_amount: number }) =>
  apiFetch<SalaryStaff>(`/admin/salaries/staff/${staffId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteSalaryStaff = async (staffId: number) =>
  apiFetch<{ message: string }>(`/admin/salaries/staff/${staffId}`, {
    method: 'DELETE',
  })

export const previewSalaryDisbursement = async () =>
  apiFetch<SalaryDisbursementPreview>('/admin/salaries/disburse/preview')

export const sendSalaryDisbursementOtp = async () =>
  apiFetch<{ message: string }>('/admin/salaries/disburse/otp', { method: 'POST' })

export const disburseSalaries = async () =>
  apiFetch<SalaryDisbursementResponse>('/admin/salaries/disburse', { method: 'POST' })

export const sendAnnouncement = async (payload: { subject: string; message: string }) =>
  apiFetch<SendAnnouncementResponse>('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const sendTestAnnouncement = async (payload: { subject: string; message: string }) =>
  apiFetch<SendAnnouncementResponse>('/admin/announcements/test', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const fetchUserProfile = async (userId: number) =>
  apiFetch<UserProfileData>(`/admin/users/${userId}/profile`)

export const fetchUserChallengeAccounts = async (userId: number) =>
  apiFetch<UserChallengeAccount[]>(`/admin/users/${userId}/accounts`)

export const fetchUserOrders = async (userId: number) =>
  apiFetch<{ orders: UserOrder[] }>(`/admin/users/${userId}/orders`)

export const fetchUserPayouts = async (userId: number) =>
  apiFetch<{ payouts: UserPayout[] }>(`/admin/users/${userId}/payouts`)

export const fetchUserSupportTickets = async (userId: number) =>
  apiFetch<UserSupportTicket[]>(`/admin/users/${userId}/support-tickets`)

export const disableUserWithdrawals = async (userId: number) =>
  apiFetch<{ message: string }>(`/admin/users/${userId}/withdrawals/disable`, { method: 'POST' })

export const enableUserWithdrawals = async (userId: number) =>
  apiFetch<{ message: string }>(`/admin/users/${userId}/withdrawals/enable`, { method: 'POST' })

export const suspendUser = async (userId: number) =>
  apiFetch<{ message: string }>(`/admin/users/${userId}/suspend`, { method: 'POST' })

export const unsuspendUser = async (userId: number) =>
  apiFetch<{ message: string }>(`/admin/users/${userId}/unsuspend`, { method: 'POST' })

export const banUser = async (userId: number) =>
  apiFetch<{ message: string }>(`/admin/users/${userId}/ban`, { method: 'POST' })

export const addUserNote = async (userId: number, note: string) =>
  apiFetch<{ message: string }>(`/admin/users/${userId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })

export const sendUserEmail = async (userId: number, subject: string, message: string) =>
  apiFetch<{ message: string }>(`/admin/users/${userId}/email`, {
    method: 'POST',
    body: JSON.stringify({ subject, message }),
  })
