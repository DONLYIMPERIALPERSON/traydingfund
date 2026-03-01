import { getSessionToken } from '@descope/react-sdk'

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL

function redirectToAdminLogin(): void {
  if (typeof window === 'undefined') return
  if (window.location.pathname !== '/login') {
    window.location.replace('/login')
  }
}

if (!BACKEND_BASE_URL) {
  throw new Error('VITE_BACKEND_URL is required')
}

export type AdminAuthMeResponse = {
  id: number
  descope_user_id: string
  email: string
  full_name: string | null
  nick_name?: string | null
  role: string
  status: string
  allowed_pages?: string[]
}

export type AdminEmailPrecheckResponse = {
  allowlisted: boolean
  status: string | null
  role: string | null
  require_mfa: boolean
  mfa_enrolled: boolean
}

export type ChallengePlanConfig = {
  id: string
  name: string
  price: string
  max_drawdown: string
  profit_target: string
  phases: string
  min_trading_days: string
  profit_split: string
  profit_cap: string
  payout_frequency: string
  status: 'Available' | 'Paused'
  enabled: boolean
}

export type ChallengeConfigResponse = {
  plans: ChallengePlanConfig[]
}

export type HeroStatsConfig = {
  total_paid_out: string
  paid_this_month: string
  paid_today: string
  trusted_traders: string
}

export type HeroStatsResponse = {
  stats: HeroStatsConfig
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
  status: 'Active' | 'Expired' | string
}

export type AdminCouponsResponse = {
  coupons: AdminCoupon[]
}

export type MT5Stage = 'Ready' | 'Phase 1' | 'Phase 2' | 'Funded' | 'Disabled'

export type MT5AssignmentMode = 'manual' | 'automatic'

export type MT5Account = {
  id: number
  server: string
  account_number: string
  password: string
  investor_password: string
  account_size: string
  status: MT5Stage
  assignment_mode: MT5AssignmentMode | null
  assigned_by_admin_name: string | null
  assigned_user_id: number | null
  assigned_at: string | null
  created_at: string
  updated_at: string
}

export type MT5AccountsResponse = {
  accounts: MT5Account[]
}

export type MT5SummaryResponse = {
  total: number
  ready: number
  assigned: number
  disabled: number
}

export type ChallengeAccountListItem = {
  challenge_id: string
  user_id: number
  trader_name: string | null
  trader_email?: string | null
  account_size: string
  phase: 'Phase 1' | 'Phase 2' | 'Funded'
  mt5_account: string | null
  mt5_server: string | null
  mt5_password: string | null
  objective_status?: string | null
  breached_reason?: string | null
  breached_at?: string | null
  passed_at?: string | null
  current_pnl?: string
  // Additional fields for profitable accounts
  rank?: number
  profit?: string
  win_rate?: string
}

export type ChallengeBreachListItem = {
  challenge_id: string
  user_id: number
  trader_name: string | null
  account_size: string
  phase: 'Phase 1' | 'Phase 2' | 'Funded'
  mt5_account: string | null
  breach_reason: string | null
  breached_at: string | null
}

export type ChallengeBreachesResponse = {
  accounts: ChallengeBreachListItem[]
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

export type AdminUsersResponse = {
  users: AdminUsersListItem[]
  stats: {
    total_users: number
    funded_users: number
    breached_users: number
  }
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

export type AdminKycProfilesResponse = {
  profiles: AdminKycProfileItem[]
  stats: {
    eligible_profiles: number
    today_eligible: number
  }
}

export type OrderStats = {
  period: string
  total_orders: number
  paid_orders: number
  pending_orders: number
  failed_orders: number
  total_volume_formatted: string
  success_rate_formatted: string
}

export type Order = {
  id: number
  provider_order_id: string
  status: string
  assignment_status: string
  account_size: string
  net_amount_formatted: string
  created_at: string | null
  paid_at: string | null
  user: {
    id: string
    name: string
    email: string
  }
  challenge_id: string | null
}

export type OrdersResponse = {
  orders: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export type OrderStatusQueryResult = {
  order_id: number
  provider_order_id: string
  status: string
  previous_status?: string
  error?: string
}

export type QueryPendingOrdersResponse = {
  total_checked: number
  updated: number
  failed: number
  orders: OrderStatusQueryResult[]
}

export type ChallengeAccountsResponse = {
  accounts: ChallengeAccountListItem[]
}

type AuthorizedRequestInit = RequestInit & { headers?: Record<string, string> }

function getTokenOrThrow(sessionToken?: string): string {
  const token = sessionToken || getSessionToken()
  if (!token) {
    throw new Error('No Descope session token available')
  }
  return token
}

async function authFetch(path: string, init: AuthorizedRequestInit = {}, sessionToken?: string): Promise<Response> {
  const token = getTokenOrThrow(sessionToken)

  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  })

  if (response.status === 401) {
    clearPersistedAdminUser()
    redirectToAdminLogin()
  }

  return response
}

async function parseBackendError(prefix: string, response: Response): Promise<Error> {
  const rawText = await response.text()
  let detail = rawText

  try {
    const parsed = JSON.parse(rawText) as { detail?: unknown }
    if (typeof parsed.detail === 'string') {
      detail = parsed.detail
    }
  } catch {
    // keep raw text fallback
  }

  return new Error(`${prefix}: ${response.status} ${detail || response.statusText}`)
}

export async function adminLoginWithBackend(sessionToken?: string): Promise<AdminAuthMeResponse> {
  const response = await authFetch('/admin/auth/login', { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Admin login failed', response)
  }
  return response.json() as Promise<AdminAuthMeResponse>
}

export async function fetchAdminMe(sessionToken?: string): Promise<AdminAuthMeResponse> {
  const response = await authFetch('/admin/auth/me', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Admin profile fetch failed', response)
  }
  return response.json() as Promise<AdminAuthMeResponse>
}

export async function precheckAdminEmail(email: string): Promise<AdminEmailPrecheckResponse> {
  const params = new URLSearchParams({ email })
  const response = await fetch(`${BACKEND_BASE_URL}/admin/auth/precheck?${params.toString()}`)
  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error('Admin service temporarily unavailable. Please retry in a moment.')
    }
    throw await parseBackendError('Admin precheck failed', response)
  }
  return response.json() as Promise<AdminEmailPrecheckResponse>
}

export async function logoutAdmin(sessionToken?: string): Promise<void> {
  try {
    await authFetch('/admin/auth/logout', { method: 'POST' }, sessionToken)
  } catch {
    // best effort logout
  }
}

export async function fetchAdminChallengeConfig(sessionToken?: string): Promise<ChallengeConfigResponse> {
  const response = await authFetch('/admin/challenges/config', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load challenge config', response)
  }
  return response.json() as Promise<ChallengeConfigResponse>
}

export async function updateAdminChallengeConfig(
  payload: { otp: string; plans: ChallengePlanConfig[] },
  sessionToken?: string,
): Promise<ChallengeConfigResponse> {
  const response = await authFetch(
    '/admin/challenges/config',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to update challenge config', response)
  }
  return response.json() as Promise<ChallengeConfigResponse>
}

export async function sendAdminChallengeConfigOtp(sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch('/admin/challenges/config/send-otp', { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to send admin OTP', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function fetchAdminHeroStats(sessionToken?: string): Promise<HeroStatsResponse> {
  const response = await authFetch('/admin/hero/stats', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load hero stats', response)
  }
  return response.json() as Promise<HeroStatsResponse>
}

export async function fetchAdminCoupons(sessionToken?: string): Promise<AdminCouponsResponse> {
  const response = await authFetch('/admin/coupons', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load coupons', response)
  }
  return response.json() as Promise<AdminCouponsResponse>
}

export async function createAdminCoupon(
  payload: {
    code: string
    discount_type: 'percent' | 'fixed'
    discount_value: number
    max_uses?: number | null
    expires_at?: string | null
    apply_all_plans: boolean
    applicable_plan_ids: string[]
  },
  sessionToken?: string,
): Promise<AdminCoupon> {
  const response = await authFetch(
    '/admin/coupons',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to create coupon', response)
  }
  return response.json() as Promise<AdminCoupon>
}

export async function updateAdminCouponStatus(
  couponId: number,
  isActive: boolean,
  sessionToken?: string,
): Promise<AdminCoupon> {
  const response = await authFetch(
    `/admin/coupons/${couponId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to update coupon status', response)
  }
  return response.json() as Promise<AdminCoupon>
}

export async function toggleAdminCouponPlan(
  couponId: number,
  payload: { plan_id: string; enabled: boolean },
  sessionToken?: string,
): Promise<AdminCoupon> {
  const response = await authFetch(
    `/admin/coupons/${couponId}/plans`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to update coupon plan toggle', response)
  }
  return response.json() as Promise<AdminCoupon>
}

export async function updateAdminHeroStats(
  payload: { otp: string; stats: HeroStatsConfig },
  sessionToken?: string,
): Promise<HeroStatsResponse> {
  const response = await authFetch(
    '/admin/hero/stats',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to update hero stats', response)
  }
  return response.json() as Promise<HeroStatsResponse>
}

export async function fetchMT5Accounts(status?: MT5Stage, sessionToken?: string): Promise<MT5AccountsResponse> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const response = await authFetch(`/admin/mt5/accounts${query}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load MT5 accounts', response)
  }
  return response.json() as Promise<MT5AccountsResponse>
}

export async function fetchAssignedMT5Accounts(sessionToken?: string): Promise<MT5AccountsResponse> {
  const response = await authFetch('/admin/mt5/accounts/assigned', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load assigned MT5 accounts', response)
  }
  return response.json() as Promise<MT5AccountsResponse>
}

export async function fetchMT5Summary(sessionToken?: string): Promise<MT5SummaryResponse> {
  const response = await authFetch('/admin/mt5/accounts/summary', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load MT5 summary', response)
  }
  return response.json() as Promise<MT5SummaryResponse>
}

export async function fetchNextChallengeId(mode: 'manual' | 'system' = 'manual', sessionToken?: string): Promise<{ challenge_id: string }> {
  const response = await authFetch(`/admin/mt5/challenge-id/next?mode=${encodeURIComponent(mode)}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to generate challenge id', response)
  }
  return response.json() as Promise<{ challenge_id: string }>
}

export async function assignMT5Account(
  accountId: number,
  payload: {
    stage: 'Phase 1' | 'Phase 2' | 'Funded'
    assigned_user_email: string
    challenge_id?: string
  },
  sessionToken?: string,
): Promise<MT5Account> {
  const response = await authFetch(
    `/admin/mt5/accounts/${accountId}/assign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to assign MT5 account', response)
  }
  return response.json() as Promise<MT5Account>
}

export async function downloadMT5Template(sessionToken?: string): Promise<string> {
  const response = await authFetch('/admin/mt5/accounts/template', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to download MT5 template', response)
  }
  return response.text()
}

export async function uploadMT5AccountsTxt(content: string, sessionToken?: string): Promise<MT5AccountsResponse> {
  const response = await authFetch(
    '/admin/mt5/accounts/upload-txt',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to upload MT5 TXT', response)
  }
  return response.json() as Promise<MT5AccountsResponse>
}

export async function deleteMT5Account(accountId: number, sessionToken?: string): Promise<void> {
  const response = await authFetch(`/admin/mt5/accounts/${accountId}`, { method: 'DELETE' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to delete MT5 account', response)
  }
}

export async function fetchChallengeAccounts(sessionToken?: string): Promise<ChallengeAccountsResponse> {
  const response = await authFetch('/admin/challenge-accounts', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load challenge accounts', response)
  }
  return response.json() as Promise<ChallengeAccountsResponse>
}

export async function fetchActiveChallengeAccounts(sessionToken?: string): Promise<ChallengeAccountsResponse> {
  const response = await authFetch('/admin/challenge-accounts/active', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load active challenge accounts', response)
  }
  return response.json() as Promise<ChallengeAccountsResponse>
}

export async function fetchFundedChallengeAccounts(sessionToken?: string): Promise<ChallengeAccountsResponse> {
  const response = await authFetch('/admin/challenge-accounts/funded', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load funded challenge accounts', response)
  }
  return response.json() as Promise<ChallengeAccountsResponse>
}

export async function fetchProfitableFundedAccounts(sessionToken?: string): Promise<ChallengeAccountsResponse> {
  const response = await authFetch('/admin/challenge-accounts/funded/profitable', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load profitable funded accounts', response)
  }
  return response.json() as Promise<ChallengeAccountsResponse>
}

export async function fetchAwaitingNextStageAccounts(sessionToken?: string): Promise<ChallengeAccountsResponse> {
  const response = await authFetch('/admin/challenge-accounts/awaiting-next-stage', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load awaiting next stage accounts', response)
  }
  return response.json() as Promise<ChallengeAccountsResponse>
}

export async function fetchBreachedChallengeAccounts(sessionToken?: string): Promise<ChallengeBreachesResponse> {
  const response = await authFetch('/admin/challenge-accounts/breaches', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load breached challenge accounts', response)
  }
  return response.json() as Promise<ChallengeBreachesResponse>
}

export async function fetchAdminUsers(sessionToken?: string): Promise<AdminUsersResponse> {
  const response = await authFetch('/admin/users', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load admin users', response)
  }
  return response.json() as Promise<AdminUsersResponse>
}

export async function fetchAdminKycProfiles(sessionToken?: string): Promise<AdminKycProfilesResponse> {
  const response = await authFetch('/admin/kyc/profiles', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load KYC profiles', response)
  }
  return response.json() as Promise<AdminKycProfilesResponse>
}

export async function fetchOrderStats(period: 'today' | 'week' | 'month' = 'today', sessionToken?: string): Promise<OrderStats> {
  const response = await authFetch(`/admin/orders/stats?period=${encodeURIComponent(period)}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load order stats', response)
  }
  return response.json() as Promise<OrderStats>
}

export async function fetchOrders(
  page: number = 1,
  limit: number = 50,
  period: 'today' | 'week' | 'month' = 'today',
  statusFilter?: string,
  search?: string,
  sessionToken?: string,
): Promise<OrdersResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    period,
  })
  if (statusFilter) params.append('status_filter', statusFilter)
  if (search) params.append('search', search)

  const response = await authFetch(`/admin/orders?${params.toString()}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load orders', response)
  }
  return response.json() as Promise<OrdersResponse>
}

export async function fetchPendingAssignments(
  page: number = 1,
  limit: number = 50,
  sessionToken?: string,
): Promise<OrdersResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  const response = await authFetch(`/admin/orders/pending-assignments?${params.toString()}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load pending assignments', response)
  }
  return response.json() as Promise<OrdersResponse>
}

export async function queryOrderStatus(orderId: number, sessionToken?: string): Promise<OrderStatusQueryResult> {
  const response = await authFetch(`/admin/orders/${orderId}/query-status`, { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to query order status', response)
  }
  return response.json() as Promise<OrderStatusQueryResult>
}

export async function queryPendingOrders(sessionToken?: string): Promise<QueryPendingOrdersResponse> {
  const response = await authFetch('/admin/orders/query-pending', { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to query pending orders', response)
  }
  return response.json() as Promise<QueryPendingOrdersResponse>
}

export async function generateCertificates(sessionToken?: string): Promise<{ message: string; generated: number; failed: number }> {
  const response = await authFetch('/admin/certificates/generate-certificates', { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to generate certificates', response)
  }
  return response.json() as Promise<{ message: string; generated: number; failed: number }>
}

export async function generatePayoutCertificates(sessionToken?: string): Promise<{ message: string; generated: number; failed: number }> {
  const response = await authFetch('/admin/payouts/generate-payout-certificates', { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to generate certificates', response)
  }
  return response.json() as Promise<{ message: string; generated: number; failed: number }>
}

export type PayoutStats = {
  period: string
  pending_review: number
  approved_today: number
  paid_today_kobo: number
  paid_today_formatted: string
  rejected: number
}

export type PayoutRequest = {
  id: number
  provider_order_id: string
  status: string
  amount_kobo: number
  amount_formatted: string
  created_at: string
  completed_at: string | null
  user: {
    id: number
    name: string
    email: string
  }
  account: {
    challenge_id: string
    account_size: string
  }
  metadata: any
}

export type PayoutRequestsResponse = {
  payouts: PayoutRequest[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export async function fetchPayoutStats(period: 'today' | 'week' | 'month' = 'today', sessionToken?: string): Promise<PayoutStats> {
  const response = await authFetch(`/admin/payouts/stats?period=${encodeURIComponent(period)}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load payout stats', response)
  }
  return response.json() as Promise<PayoutStats>
}

export async function fetchPayoutRequests(
  page: number = 1,
  limit: number = 50,
  period: 'today' | 'week' | 'month' = 'today',
  statusFilter?: string,
  search?: string,
  sessionToken?: string,
): Promise<PayoutRequestsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    period,
  })
  if (statusFilter) params.append('status_filter', statusFilter)
  if (search) params.append('search', search)

  const response = await authFetch(`/admin/payouts?${params.toString()}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load payout requests', response)
  }
  return response.json() as Promise<PayoutRequestsResponse>
}

export async function approvePayout(payoutId: number, sessionToken?: string): Promise<{ success: boolean; message: string }> {
  const response = await authFetch(`/admin/payouts/${payoutId}/approve`, { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to approve payout', response)
  }
  return response.json() as Promise<{ success: boolean; message: string }>
}

export async function rejectPayout(payoutId: number, reason: string, sessionToken?: string): Promise<{ success: boolean; message: string }> {
  const response = await authFetch(`/admin/payouts/${payoutId}/reject?reason=${encodeURIComponent(reason)}`, { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to reject payout', response)
  }
  return response.json() as Promise<{ success: boolean; message: string }>
}

export function persistAdminUser(user: AdminAuthMeResponse): void {
  localStorage.setItem('nairatrader_admin_auth_user', JSON.stringify(user))
}

export function getPersistedAdminUser(): AdminAuthMeResponse | null {
  const raw = localStorage.getItem('nairatrader_admin_auth_user')
  if (!raw) return null

  try {
    return JSON.parse(raw) as AdminAuthMeResponse
  } catch {
    return null
  }
}

export function clearPersistedAdminUser(): void {
  localStorage.removeItem('nairatrader_admin_auth_user')
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
  last_message: string
  unread_count: number
  user_unread_count: number
}

export type SupportTicketsResponse = {
  tickets: SupportTicket[]
}

export type SupportMessage = {
  id: string
  chat_id: string
  sender: 'user' | 'support'
  message: string
  image_url: string | null
  is_read: boolean
  created_at: string
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
  last_message: string
  unread_count: number
  user_unread_count: number
  messages: SupportMessage[]
}

export async function fetchSupportTickets(status?: 'open' | 'closed', sessionToken?: string): Promise<SupportTicket[]> {
  const params = status ? `?status=${encodeURIComponent(status)}` : ''
  const response = await authFetch(`/admin/support/chats${params}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load support tickets', response)
  }
  return response.json() as Promise<SupportTicket[]>
}

export async function fetchSupportChat(chatId: string, sessionToken?: string): Promise<SupportChat> {
  const response = await authFetch(`/admin/support/chats/${chatId}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load support chat', response)
  }
  return response.json() as Promise<SupportChat>
}

export async function assignSupportChat(chatId: string, adminName: string, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(
    `/admin/support/chats/${chatId}/assign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_name: adminName }),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to assign support chat', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function sendSupportMessage(
  chatId: string,
  message: string,
  adminName: string,
  sessionToken?: string,
): Promise<SupportMessage> {
  const response = await authFetch(
    `/admin/support/chats/${chatId}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, admin_name: adminName }),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to send support message', response)
  }
  return response.json() as Promise<SupportMessage>
}

export async function closeSupportChat(chatId: string, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/support/chats/${chatId}/close`, { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to close support chat', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function markSupportChatAsRead(chatId: string, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/support/chats/${chatId}/read`, { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to mark support chat as read', response)
  }
  return response.json() as Promise<{ message: string }>
}

export type AdminAllowlistEntry = {
  id: number
  email: string
  full_name: string | null
  descope_user_id: string | null
  role: string
  status: string
  require_mfa: boolean
  mfa_enrolled: boolean
  allowed_pages: string[] | null
  created_by_user_id: number | null
}

export type AdminAllowlistResponse = {
  admins: AdminAllowlistEntry[]
}

export async function fetchAdminAllowlist(sessionToken?: string): Promise<AdminAllowlistResponse> {
  const response = await authFetch('/admin/auth/allowlist', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load admin allowlist', response)
  }
  const data = await response.json() as AdminAllowlistEntry[]
  return { admins: data }
}

export async function createAdminAllowlistEntry(
  payload: {
    email: string
    full_name?: string
    role: 'admin' | 'super_admin'
    require_mfa?: boolean
    allowed_pages?: string[]
  },
  sessionToken?: string,
): Promise<AdminAllowlistEntry> {
  const response = await authFetch(
    '/admin/auth/allowlist',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to create admin allowlist entry', response)
  }
  return response.json() as Promise<AdminAllowlistEntry>
}

export async function updateAdminAllowlistEntry(
  entryId: number,
  payload: {
    full_name?: string
    role?: 'admin' | 'super_admin'
    status?: 'active' | 'disabled'
    require_mfa?: boolean
    allowed_pages?: string[]
  },
  sessionToken?: string,
): Promise<AdminAllowlistEntry> {
  const response = await authFetch(
    `/admin/auth/allowlist/${entryId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to update admin allowlist entry', response)
  }
  return response.json() as Promise<AdminAllowlistEntry>
}

export type SendAnnouncementRequest = {
  subject: string
  message: string
}

export type SendAnnouncementResponse = {
  message: string
  recipient_count?: number
}

export async function sendAnnouncement(
  payload: SendAnnouncementRequest,
  sessionToken?: string,
): Promise<SendAnnouncementResponse> {
  const response = await authFetch(
    '/admin/announcements/send',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to send announcement', response)
  }
  return response.json() as Promise<SendAnnouncementResponse>
}

export async function sendTestAnnouncement(
  payload: SendAnnouncementRequest,
  sessionToken?: string,
): Promise<SendAnnouncementResponse> {
  const response = await authFetch(
    '/admin/announcements/send-test',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to send test announcement', response)
  }
  return response.json() as Promise<SendAnnouncementResponse>
}

export async function fetchMonthlyFinanceStats(sessionToken?: string): Promise<{ monthlyFinance: Array<{ month: string; totalPurchase: string; totalPayouts: string }> }> {
  const response = await authFetch('/admin/finance/monthly-stats', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load monthly finance stats', response)
  }
  return response.json() as Promise<{ monthlyFinance: Array<{ month: string; totalPurchase: string; totalPayouts: string }> }>
}

export async function fetchDashboardStats(sessionToken?: string): Promise<{
  kpis: {
    totalRevenue: string
    totalRevenueChange: number
    todaySales: string
    todaySalesChange: number
    totalPayouts: string
    totalPayoutsChange: number
    newSignups: number
    newSignupsChange: number
    activeChallengeAccounts: number
    activeChallengeAccountsChange: number
    passRate: string
    passRateChange: number
    pendingPayoutRequests: string
    pendingPayoutRequestsChange: number
    todayApprovedPayouts: string
    todayApprovedPayoutsChange: number
  }
  operationsQueues: {
    payoutsPendingReview: number
    payoutsOldestHours: number
    supportTicketsOpen: number
    supportTicketsOldestHours: number
    provisioningFailures: number
    webhookFailures: number
  }
  challengeOutcomes: {
    passed: number
    failed: number
    expired: number
  }
  accountCounts: {
    ready: number
    phase1: number
    phase2: number
    funded: number
  }
  supportOverview: {
    openTickets: number
    avgFirstResponse: string
    avgResolution: string
  }
  systemHealth: {
    brokerBridge: string
    tradeIngestionLag: string
    webhooksSuccess: string
    emailBounce: string
    kycProvider: string
  }
}> {
  const response = await authFetch('/admin/finance/dashboard-stats', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load dashboard stats', response)
  }
  return response.json() as Promise<{
    kpis: {
      totalRevenue: string
      totalRevenueChange: number
      todaySales: string
      todaySalesChange: number
      totalPayouts: string
      totalPayoutsChange: number
      newSignups: number
      newSignupsChange: number
      activeChallengeAccounts: number
      activeChallengeAccountsChange: number
      passRate: string
      passRateChange: number
      pendingPayoutRequests: string
      pendingPayoutRequestsChange: number
      todayApprovedPayouts: string
      todayApprovedPayoutsChange: number
    }
    operationsQueues: {
      payoutsPendingReview: number
      payoutsOldestHours: number
      supportTicketsOpen: number
      supportTicketsOldestHours: number
      provisioningFailures: number
      webhookFailures: number
    }
    challengeOutcomes: {
      passed: number
      failed: number
      expired: number
    }
    accountCounts: {
      ready: number
      phase1: number
      phase2: number
      funded: number
    }
    supportOverview: {
      openTickets: number
      avgFirstResponse: string
      avgResolution: string
    }
    systemHealth: {
      brokerBridge: string
      tradeIngestionLag: string
      webhooksSuccess: string
      emailBounce: string
      kycProvider: string
    }
  }>
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
  product_summary: string | null
}

export type AffiliatePayout = {
  id: number
  affiliate: string
  amount: number
  status: string
  bank_details: string
  requested_at: string
  approved_at: string | null
}

export type AffiliateMilestone = {
  id: number
  affiliate: string
  level: number
  status: string
  requested_at: string
  processed_at: string | null
}

export type AffiliateCommissionsResponse = {
  commissions: AffiliateCommission[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export type AffiliatePayoutsResponse = {
  payouts: AffiliatePayout[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export type AffiliateMilestonesResponse = {
  milestones: AffiliateMilestone[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export async function fetchAffiliateOverview(sessionToken?: string): Promise<AffiliateOverviewStats> {
  const response = await authFetch('/admin/affiliate/overview', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load affiliate overview', response)
  }
  return response.json() as Promise<AffiliateOverviewStats>
}

export async function fetchAffiliateCommissions(
  page: number = 1,
  perPage: number = 50,
  sessionToken?: string,
): Promise<AffiliateCommissionsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  })

  const response = await authFetch(`/admin/affiliate/commissions?${params.toString()}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load affiliate commissions', response)
  }
  return response.json() as Promise<AffiliateCommissionsResponse>
}

export async function fetchAffiliatePayouts(
  page: number = 1,
  perPage: number = 50,
  statusFilter?: string,
  sessionToken?: string,
): Promise<AffiliatePayoutsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  })
  if (statusFilter) params.append('status_filter', statusFilter)

  const response = await authFetch(`/admin/affiliate/payouts?${params.toString()}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load affiliate payouts', response)
  }
  return response.json() as Promise<AffiliatePayoutsResponse>
}

export async function fetchAffiliateMilestones(
  page: number = 1,
  perPage: number = 50,
  statusFilter?: string,
  sessionToken?: string,
): Promise<AffiliateMilestonesResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  })
  if (statusFilter) params.append('status_filter', statusFilter)

  const response = await authFetch(`/admin/affiliate/milestones?${params.toString()}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load affiliate milestones', response)
  }
  return response.json() as Promise<AffiliateMilestonesResponse>
}

export async function approveAffiliatePayout(payoutId: number, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/affiliate/payouts/${payoutId}/approve`, { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to approve affiliate payout', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function rejectAffiliatePayout(payoutId: number, reason?: string, sessionToken?: string): Promise<{ message: string }> {
  const url = reason ? `/admin/affiliate/payouts/${payoutId}/reject?reason=${encodeURIComponent(reason)}` : `/admin/affiliate/payouts/${payoutId}/reject`
  const response = await authFetch(url, { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to reject affiliate payout', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function approveAffiliateMilestone(milestoneId: number, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/affiliate/milestones/${milestoneId}/approve`, { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to approve affiliate milestone', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function rejectAffiliateMilestone(milestoneId: number, reason?: string, sessionToken?: string): Promise<{ message: string }> {
  const url = reason ? `/admin/affiliate/milestones/${milestoneId}/reject?reason=${encodeURIComponent(reason)}` : `/admin/affiliate/milestones/${milestoneId}/reject`
  const response = await authFetch(url, { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to reject affiliate milestone', response)
  }
  return response.json() as Promise<{ message: string }>
}

export type UserProfileData = {
  user_id: number
  name: string
  email: string
  status: string
  kyc_status: string
  trading: string
  accounts: string
  revenue: string
  orders: string
  payouts: string
}

export type UserChallengeAccount = {
  challenge_id: string
  user_id: number
  trader_name: string | null
  trader_email?: string | null
  account_size: string
  phase: 'Phase 1' | 'Phase 2' | 'Funded' | 'Withdrawn'
  mt5_account: string | null
  mt5_server: string | null
  mt5_password: string | null
  objective_status: string | null
  breached_reason: string | null
  breached_at: string | null
  passed_at: string | null
}

export type UserOrder = {
  id: number
  provider_order_id: string
  status: string
  assignment_status: string
  account_size: string
  net_amount_formatted: string
  created_at: string | null
  paid_at: string | null
  challenge_id: string | null
}

export type UserPayout = {
  id: number
  provider_order_id: string
  status: string
  amount_formatted: string
  created_at: string | null
  completed_at: string | null
  account: {
    challenge_id: string
    account_size: string
  }
}

export type UserSupportTicket = {
  id: string
  subject: string
  status: 'open' | 'closed'
  priority: 'low' | 'medium' | 'high'
  assigned_to: string | null
  user_name: string
  user_email: string
  created_at: string
  updated_at: string
  last_message: string
  unread_count: number
  user_unread_count: number
}

export async function fetchUserProfile(userId: number, sessionToken?: string): Promise<UserProfileData> {
  const response = await authFetch(`/admin/users/${userId}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load user profile', response)
  }
  return response.json() as Promise<UserProfileData>
}

export async function fetchUserChallengeAccounts(userId: number, sessionToken?: string): Promise<UserChallengeAccount[]> {
  const response = await authFetch(`/admin/challenge-accounts?user_id=${userId}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load user challenge accounts', response)
  }
  const data = await response.json() as { accounts: UserChallengeAccount[] }
  return data.accounts
}

export async function fetchUserOrders(userId: number, page: number = 1, limit: number = 50, sessionToken?: string): Promise<{ orders: UserOrder[], pagination: any }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search: userId.toString(), // Search by user ID
  })

  const response = await authFetch(`/admin/orders?${params.toString()}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load user orders', response)
  }
  return response.json() as Promise<{ orders: UserOrder[], pagination: any }>
}

export async function fetchUserPayouts(userId: number, page: number = 1, limit: number = 50, sessionToken?: string): Promise<{ payouts: UserPayout[], pagination: any }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search: userId.toString(), // Search by user ID
  })

  const response = await authFetch(`/admin/payouts?${params.toString()}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load user payouts', response)
  }
  return response.json() as Promise<{ payouts: UserPayout[], pagination: any }>
}

export async function fetchUserSupportTickets(_userId: number, sessionToken?: string): Promise<UserSupportTicket[]> {
  const response = await authFetch('/admin/support/chats', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load support tickets', response)
  }
  const tickets = await response.json() as UserSupportTicket[]
  // Filter tickets for this user
  return tickets.filter(_ticket => {
    // We need to get user info for each ticket, but the API doesn't return user_id
    // For now, we'll return all tickets and let the frontend filter by user name/email
    return true
  })
}

export type MigrationRequest = {
  id: number
  user_id: number
  user_name: string
  user_email: string
  request_type: 'phase2' | 'funded'
  account_size: string
  mt5_server: string
  mt5_account_number: string
  mt5_password: string
  bank_account_number: string | null
  bank_code: string | null
  bank_name: string | null
  account_name: string | null
  status: 'pending' | 'approved' | 'declined'
  admin_notes: string | null
  withdrawal_amount: number | null
  transfer_reference: string | null
  created_at: string
  processed_at: string | null
  processed_by_admin_id: number | null
}

export async function fetchMigrationRequests(sessionToken?: string): Promise<MigrationRequest[]> {
  const response = await authFetch('/admin/migration-requests', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load migration requests', response)
  }
  return response.json() as Promise<MigrationRequest[]>
}

export async function updateMigrationRequestStatus(
  requestId: number,
  status: 'approved' | 'declined',
  notes?: string,
  withdrawalAmount?: number,
  sessionToken?: string,
): Promise<MigrationRequest> {
  const payload: any = { status, admin_notes: notes }
  if (withdrawalAmount !== undefined) {
    payload.withdrawal_amount = withdrawalAmount
  }

  const response = await authFetch(
    `/admin/migration-requests/${requestId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to update migration request status', response)
  }
  return response.json() as Promise<MigrationRequest>
}

export async function updateUserStatus(userId: number, status: 'active' | 'disabled', sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to update user status', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function disableUserWithdrawals(userId: number, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/users/${userId}/withdrawals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: false }),
  }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to disable user withdrawals', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function enableUserWithdrawals(userId: number, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/users/${userId}/withdrawals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: true }),
  }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to enable user withdrawals', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function suspendUser(userId: number, reason?: string, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/users/${userId}/suspend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to suspend user', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function unsuspendUser(userId: number, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/users/${userId}/unsuspend`, { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to unsuspend user', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function banUser(userId: number, reason: string, duration?: string, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/users/${userId}/ban`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, duration }),
  }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to ban user', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function addUserNote(userId: number, note: string, tag?: string, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/users/${userId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note, tag }),
  }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to add user note', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function sendUserEmail(userId: number, subject: string, message: string, template?: string, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/users/${userId}/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, message, template }),
  }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to send user email', response)
  }
  return response.json() as Promise<{ message: string }>
}

export type AdminWorkboardStats = {
  top_performer: {
    admin_id: number
    admin_name: string
    role: string
    total_actions: number
    performance_score: number
    action_breakdown: Record<string, number>
    avg_response_time: string
    rank: number
  } | null
  admin_rankings: Array<{
    admin_id: number
    admin_name: string
    role: string
    total_actions: number
    performance_score: number
    action_breakdown: Record<string, number>
    avg_response_time: string
    rank: number
  }>
  recent_activities: Array<{
    id: number
    admin_name: string
    action: string
    description: string
    time_ago: string
  }>
  summary: {
    total_admins: number
    total_actions: number
    period_days: number
  }
}

export type AdminActivity = {
  id: number
  admin_id: number
  admin_name: string
  action: string
  description: string
  entity_type: string
  entity_id: number | null
  metadata: string | null
  created_at: string
  time_ago: string
}

export type AdminActivitiesResponse = {
  activities: AdminActivity[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  filters: {
    admin_id: number | null
    action: string | null
    entity_type: string | null
    days: number
  }
}

export type EmailLogItem = {
  id: number
  to_email: string
  subject: string
  status: string
  created_at: string | null
}

export type EmailLogsResponse = {
  emails: EmailLogItem[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export async function fetchEmailLogs(
  page: number = 1,
  limit: number = 10,
  sessionToken?: string,
): Promise<EmailLogsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  const response = await authFetch(`/admin/emails?${params.toString()}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load email logs', response)
  }
  return response.json() as Promise<EmailLogsResponse>
}

export async function fetchAdminWorkboardStats(days: number = 30, sessionToken?: string): Promise<AdminWorkboardStats> {
  const response = await authFetch(`/admin/workboard/stats?days=${days}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load workboard stats', response)
  }
  return response.json() as Promise<AdminWorkboardStats>
}

export async function fetchAdminActivities(
  page: number = 1,
  limit: number = 50,
  adminId?: number,
  action?: string,
  entityType?: string,
  days: number = 7,
  sessionToken?: string,
): Promise<AdminActivitiesResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    days: days.toString(),
  })
  if (adminId) params.append('admin_id', adminId.toString())
  if (action) params.append('action', action)
  if (entityType) params.append('entity_type', entityType)

  const response = await authFetch(`/admin/workboard/activities?${params.toString()}`, {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load admin activities', response)
  }
  return response.json() as Promise<AdminActivitiesResponse>
}

export type SalaryBank = {
  bank_code: string
  bank_name: string
}

export type SalaryStaff = {
  id: number
  staff_name: string
  bank_code: string
  bank_name: string
  bank_account_number: string
  salary_amount: number
  created_at: string
  updated_at: string
}

export type SalaryStaffListResponse = {
  staff: SalaryStaff[]
  total_count: number
  total_salary: number
}

export type SalaryDisbursementPreview = {
  summary: {
    total_staff: number
    total_amount: number
  }
  staff: SalaryStaff[]
}

export type SalaryDisbursementResult = {
  staff_id: number
  staff_name: string
  amount: number
  status: string
  reference?: string | null
  message?: string | null
}

export type SalaryDisbursementResponse = {
  summary: {
    total_staff: number
    total_amount: number
  }
  transfers: SalaryDisbursementResult[]
}

export async function fetchSalaryBanks(sessionToken?: string): Promise<{ banks: SalaryBank[] }> {
  const response = await authFetch('/admin/salaries/banks', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load banks', response)
  }
  return response.json() as Promise<{ banks: SalaryBank[] }>
}

export async function resolveSalaryAccountName(
  payload: { bank_code: string; bank_account_number: string },
  sessionToken?: string,
): Promise<{ bank_code: string; bank_account_number: string; account_name: string }> {
  const response = await authFetch(
    '/admin/salaries/resolve-account',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to verify bank account', response)
  }
  return response.json() as Promise<{ bank_code: string; bank_account_number: string; account_name: string }>
}

export async function fetchSalaryStaff(sessionToken?: string): Promise<SalaryStaffListResponse> {
  const response = await authFetch('/admin/salaries', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load staff salaries', response)
  }
  return response.json() as Promise<SalaryStaffListResponse>
}

export async function createSalaryStaff(
  payload: { bank_code: string; bank_account_number: string; staff_name: string; salary_amount: number },
  sessionToken?: string,
): Promise<SalaryStaff> {
  const response = await authFetch(
    '/admin/salaries',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to create staff salary', response)
  }
  return response.json() as Promise<SalaryStaff>
}

export async function updateSalaryStaff(
  staffId: number,
  payload: { staff_name?: string; salary_amount?: number },
  sessionToken?: string,
): Promise<SalaryStaff> {
  const response = await authFetch(
    `/admin/salaries/${staffId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to update staff salary', response)
  }
  return response.json() as Promise<SalaryStaff>
}

export async function deleteSalaryStaff(staffId: number, sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch(`/admin/salaries/${staffId}`, { method: 'DELETE' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to delete staff salary', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function previewSalaryDisbursement(sessionToken?: string): Promise<SalaryDisbursementPreview> {
  const response = await authFetch('/admin/salaries/disburse/preview', {}, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to load disbursement preview', response)
  }
  return response.json() as Promise<SalaryDisbursementPreview>
}

export async function sendSalaryDisbursementOtp(sessionToken?: string): Promise<{ message: string }> {
  const response = await authFetch('/admin/salaries/send-otp', { method: 'POST' }, sessionToken)
  if (!response.ok) {
    throw await parseBackendError('Failed to send salary OTP', response)
  }
  return response.json() as Promise<{ message: string }>
}

export async function disburseSalaries(
  payload: { otp: string; description?: string },
  sessionToken?: string,
): Promise<SalaryDisbursementResponse> {
  const response = await authFetch(
    '/admin/salaries/disburse',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    sessionToken,
  )
  if (!response.ok) {
    throw await parseBackendError('Failed to disburse salaries', response)
  }
  return response.json() as Promise<SalaryDisbursementResponse>
}
