import { getSessionToken } from '@descope/react-sdk'

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL

function redirectToUserLogin(): void {
  if (typeof window === 'undefined') return
  if (window.location.pathname !== '/login') {
    window.location.replace('/login')
  }
}

if (!BACKEND_BASE_URL) {
  throw new Error('VITE_BACKEND_URL is required')
}

export type AuthMeResponse = {
  id: number
  descope_user_id: string
  email: string
  full_name: string | null
  nick_name?: string | null
  use_nickname_for_certificates?: boolean
  role: string
  status: string
  kyc_status?: string | null
}

export type BankListItem = {
  bank_code: string
  bank_name: string
  bank_url?: string | null
}

export type BankAccountProfile = {
  user_id: number
  bank_code: string
  bank_account_number: string
  account_name: string
  is_verified: boolean
  verified_at: string | null
}

export type WithdrawalPrecheckResponse = {
  kyc_completed: boolean
  bank_account_verified: boolean
  has_funded_account: boolean
  eligible_for_withdrawal: boolean
  message: string
  payout_destination: BankAccountProfile | null
}

export type KycEligibilityResponse = {
  eligible: boolean
  message: string
}

export type UserChallengeAccountListItem = {
  challenge_id: string
  account_size: string
  phase: string
  objective_status: string
  display_status: string
  is_active: boolean
  mt5_account: string | null
  started_at: string | null
  breached_at: string | null
  passed_at: string | null
  passed_stage: string | null
}

export type UserChallengeAccountListResponse = {
  has_any_accounts: boolean
  has_active_accounts: boolean
  active_accounts: UserChallengeAccountListItem[]
  history_accounts: UserChallengeAccountListItem[]
}

export type UserChallengeObjectiveStatus = {
  label: string
  status: 'passed' | 'pending' | 'breached' | string
  note?: string | null
}

export type UserChallengeMetrics = {
  balance: number
  equity: number
  unrealized_pnl: number
  max_permitted_loss_left: number
  highest_balance: number
  breach_balance: number
  profit_target_balance: number
  win_rate: number
  closed_trades_count: number
  winning_trades_count: number
  lots_traded_total: number
  today_closed_pnl: number
  today_trades_count: number
  today_lots_total: number
  min_trading_days_required: number
  min_trading_days_met: boolean
  stage_elapsed_hours: number
  scalping_violations_count: number
}

export type UserChallengeCredentials = {
  server: string
  account_number: string
  password: string
  investor_password: string
}

export type UserChallengeAccountDetailResponse = {
  challenge_id: string
  account_size: string
  phase: string
  objective_status: string
  breached_reason: string | null
  started_at: string | null
  breached_at: string | null
  passed_at: string | null
  mt5_account: string | null
  last_feed_at: string | null
  last_refresh_requested_at: string | null
  metrics: UserChallengeMetrics
  objectives: Record<string, UserChallengeObjectiveStatus>
  credentials: UserChallengeCredentials | null
  // Funded account profit data
  funded_profit_raw: number | null
  funded_profit_capped: number | null
  funded_profit_cap_amount: number | null
  funded_user_payout_amount: number | null
}

export type CertificateResponse = {
  id: number
  certificate_type: string
  title: string
  description: string | null
  certificate_url: string
  generated_at: string
  related_entity_id: string | null
  certificate_metadata: string | null
}

export type CertificateListResponse = {
  certificates: CertificateResponse[]
}

export type PublicChallengePlan = {
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

export type CheckoutCouponPreviewResponse = {
  code: string
  plan_id: string
  original_amount: number
  discount_amount: number
  final_amount: number
  formatted_original_amount: string
  formatted_discount_amount: string
  formatted_final_amount: string
}

export type PublicCouponResponse = {
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
  status: string
}

export type PaymentOrderResponse = {
  provider_order_id: string
  status: string
  assignment_status: string
  currency: string
  gross_amount_kobo: number
  discount_amount_kobo: number
  net_amount_kobo: number
  plan_id: string
  account_size: string
  coupon_code: string | null
  checkout_url: string | null
  payer_bank_name: string | null
  payer_account_name: string | null
  payer_virtual_acc_no: string | null
  expires_at: string | null
  challenge_id: string | null
}

export type PaymentStatusRefreshResponse = {
  provider_order_id: string
  status: string
  assignment_status: string
  challenge_id: string | null
  message: string
}

function parseBackendError(prefix: string, status: number, rawText: string): Error {
  let detail = rawText
  try {
    const parsed = JSON.parse(rawText) as { detail?: unknown }
    if (typeof parsed.detail === 'string') {
      detail = parsed.detail
    }
  } catch {
    // keep raw text fallback
  }
  return new Error(`${prefix}: ${status} ${detail || 'Request failed'}`)
}

export async function fetchCurrentUser(sessionToken?: string): Promise<AuthMeResponse> {
  const token = sessionToken || getSessionToken()
  if (!token) {
    throw new Error('No Descope session token available')
  }

  const response = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (response.status === 401) {
      clearPersistedAuthUser()
    }
    throw new Error(`Backend auth failed: ${response.status} ${errorText}`)
  }

  return response.json() as Promise<AuthMeResponse>
}

export async function loginWithBackend(sessionToken?: string): Promise<AuthMeResponse> {
  const token = sessionToken || getSessionToken()
  if (!token) {
    throw new Error('No Descope session token available')
  }

  const response = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (response.status === 401) {
      clearPersistedAuthUser()
    }
    throw new Error(`Backend login failed: ${response.status} ${errorText}`)
  }

  return response.json() as Promise<AuthMeResponse>
}

export async function logoutFromBackend(sessionToken?: string): Promise<void> {
  const token = sessionToken || getSessionToken()
  if (!token) {
    return
  }

  await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function fetchProfile(sessionToken?: string): Promise<AuthMeResponse> {
  const response = await authFetch('/profile/me', {}, sessionToken)

  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Profile fetch failed', response.status, errorText)
  }

  return response.json() as Promise<AuthMeResponse>
}

export async function updateProfile(payload: { full_name?: string; nick_name?: string }, sessionToken?: string): Promise<AuthMeResponse> {
  const response = await authFetch('/profile/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }, sessionToken)

  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Profile update failed', response.status, errorText)
  }

  return response.json() as Promise<AuthMeResponse>
}

export async function updateCertificateNameSetting(use_nickname: boolean, sessionToken?: string): Promise<{ use_nickname_for_certificates: boolean }> {
  const response = await authFetch('/profile/settings/certificate-name', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(use_nickname),
  }, sessionToken)

  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Certificate name setting update failed', response.status, errorText)
  }

  return response.json() as Promise<{ use_nickname_for_certificates: boolean }>
}

type AuthorizedRequestInit = RequestInit & { headers?: Record<string, string> }

async function authFetch(path: string, init: AuthorizedRequestInit = {}, sessionToken?: string): Promise<Response> {
  const token = sessionToken || getSessionToken()
  if (!token) {
    throw new Error('No Descope session token available')
  }

  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  })

  if (response.status === 401) {
    clearPersistedAuthUser()
    redirectToUserLogin()
  }

  return response
}

export async function getPinStatus(): Promise<{ has_pin: boolean }> {
  const response = await authFetch('/pin/status')
  if (!response.ok) {
    throw new Error(`PIN status failed: ${response.status}`)
  }
  return response.json() as Promise<{ has_pin: boolean }>
}

export async function sendPinOtp(purpose: 'set' | 'reset'): Promise<{ message: string }> {
  const response = await authFetch('/pin/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose }),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Send PIN OTP failed: ${response.status} ${errorText}`)
  }
  return response.json() as Promise<{ message: string }>
}

export async function setPin(payload: { new_pin: string; confirm_pin: string; otp: string }): Promise<{ message: string }> {
  const response = await authFetch('/pin/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Set PIN failed: ${response.status} ${errorText}`)
  }
  return response.json() as Promise<{ message: string }>
}

export async function changePin(payload: { old_pin: string; new_pin: string }): Promise<{ message: string }> {
  const response = await authFetch('/pin/change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Change PIN failed: ${response.status} ${errorText}`)
  }
  return response.json() as Promise<{ message: string }>
}

export async function resetPin(payload: { otp: string; new_pin: string; confirm_pin: string }): Promise<{ message: string }> {
  const response = await authFetch('/pin/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Reset PIN failed: ${response.status} ${errorText}`)
  }
  return response.json() as Promise<{ message: string }>
}

export async function fetchBankList(refresh = false): Promise<{ banks: BankListItem[] }> {
  const query = refresh ? '?refresh=true' : ''
  const response = await authFetch(`/profile/banks${query}`)
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Failed to load banks', response.status, errorText)
  }
  return response.json() as Promise<{ banks: BankListItem[] }>
}

export async function resolveKycAccountName(payload: {
  bank_code: string
  bank_account_number: string
}): Promise<{ bank_code: string; bank_account_number: string; account_name: string }> {
  const response = await authFetch('/profile/kyc/resolve-account-name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Account name resolution failed', response.status, errorText)
  }
  return response.json() as Promise<{ bank_code: string; bank_account_number: string; account_name: string }>
}

export async function submitKyc(payload: {
  bank_code: string
  bank_account_number: string
}): Promise<{ status: string; message: string; kyc_status: string; bank_account: BankAccountProfile }> {
  const response = await authFetch('/profile/kyc/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('KYC submission failed', response.status, errorText)
  }
  return response.json() as Promise<{ status: string; message: string; kyc_status: string; bank_account: BankAccountProfile }>
}

export async function fetchBankAccountProfile(): Promise<BankAccountProfile | null> {
  const response = await authFetch('/profile/bank-account')
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Bank profile fetch failed', response.status, errorText)
  }
  return response.json() as Promise<BankAccountProfile | null>
}

export async function fetchKycEligibility(): Promise<KycEligibilityResponse> {
  const response = await authFetch('/profile/kyc/eligibility')
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('KYC eligibility check failed', response.status, errorText)
  }
  return response.json() as Promise<KycEligibilityResponse>
}

export async function fetchWithdrawalPrecheck(): Promise<WithdrawalPrecheckResponse> {
  const response = await authFetch('/profile/withdrawal/precheck')
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Withdrawal precheck failed', response.status, errorText)
  }
  return response.json() as Promise<WithdrawalPrecheckResponse>
}

export async function fetchUserChallengeAccounts(): Promise<UserChallengeAccountListResponse> {
  const response = await authFetch('/profile/challenge-accounts')
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Challenge accounts fetch failed', response.status, errorText)
  }
  return response.json() as Promise<UserChallengeAccountListResponse>
}

export async function fetchUserChallengeAccountDetail(challengeId: string): Promise<UserChallengeAccountDetailResponse> {
  const response = await authFetch(`/profile/challenge-accounts/${encodeURIComponent(challengeId)}`)
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Challenge account detail fetch failed', response.status, errorText)
  }
  return response.json() as Promise<UserChallengeAccountDetailResponse>
}

export async function refreshChallengeAccount(challengeId: string): Promise<{ status: string }> {
  const response = await authFetch(`/profile/challenge-accounts/${encodeURIComponent(challengeId)}/refresh`, {
    method: 'POST',
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Challenge account refresh failed', response.status, errorText)
  }
  return response.json() as Promise<{ status: string }>
}

export async function fetchPublicChallengePlans(): Promise<PublicChallengePlan[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/public/challenges/config`, { cache: 'no-store' })
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Public challenge plans fetch failed', response.status, errorText)
  }
  const payload = await response.json() as { plans?: PublicChallengePlan[] }
  return Array.isArray(payload.plans) ? payload.plans : []
}

export async function previewCheckoutCoupon(payload: {
  code: string
  plan_id: string
}): Promise<CheckoutCouponPreviewResponse> {
  const response = await authFetch('/checkout/coupons/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Coupon preview failed', response.status, errorText)
  }
  return response.json() as Promise<CheckoutCouponPreviewResponse>
}

export async function initPalmPayBankTransfer(payload: {
  plan_id: string
  coupon_code?: string | null
}): Promise<PaymentOrderResponse> {
  const response = await authFetch('/payments/palmpay/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan_id: payload.plan_id,
      coupon_code: payload.coupon_code || null,
      channel: 'bank_transfer',
    }),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Payment initialization failed', response.status, errorText)
  }
  return response.json() as Promise<PaymentOrderResponse>
}

export async function refreshPaymentOrderStatus(providerOrderId: string): Promise<PaymentStatusRefreshResponse> {
  const response = await authFetch(`/payments/orders/${encodeURIComponent(providerOrderId)}/refresh`, {
    method: 'POST',
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Payment status refresh failed', response.status, errorText)
  }
  return response.json() as Promise<PaymentStatusRefreshResponse>
}

export async function fetchCertificates(): Promise<CertificateListResponse> {
  const response = await authFetch('/certificates')
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Certificates fetch failed', response.status, errorText)
  }
  return response.json() as Promise<CertificateListResponse>
}

export async function fetchPublicCoupons(): Promise<{ coupons: PublicCouponResponse[] }> {
  const response = await fetch(`${BACKEND_BASE_URL}/coupons`, { cache: 'no-store' })
  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Public coupons fetch failed', response.status, errorText)
  }
  return response.json() as Promise<{ coupons: PublicCouponResponse[] }>
}

export function persistAuthUser(user: AuthMeResponse): void {
  localStorage.setItem('nairatrader_auth_user', JSON.stringify(user))
}

export function getPersistedAuthUser(): AuthMeResponse | null {
  const raw = localStorage.getItem('nairatrader_auth_user')
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthMeResponse
  } catch {
    return null
  }
}

export function clearPersistedAuthUser(): void {
  localStorage.removeItem('nairatrader_auth_user')
}
