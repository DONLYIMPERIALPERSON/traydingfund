import { apiFetch } from '../lib/api'

const MOCK_USER_KEY = 'nairatrader_auth_user'

export type AuthMeResponse = {
  id: number
  descope_user_id: string
  email: string
  full_name: string | null
  first_name?: string | null
  last_name?: string | null
  nick_name?: string | null
  use_nickname_for_certificates?: boolean
  overall_reward_currency?: string
  role: string
  status: string
  kyc_status?: string | null
  payout_method_type?: string | null
  payout_bank_name?: string | null
  payout_bank_code?: string | null
  payout_account_number?: string | null
  payout_account_name?: string | null
  payout_crypto_currency?: string | null
  payout_crypto_address?: string | null
  payout_crypto_first_name?: string | null
  payout_crypto_last_name?: string | null
  payout_verified_at?: string | null
}

export type BankListItem = {
  bank_code: string
  bank_name: string
  routing_key?: string | null
  logo_image?: string | null
}

export type BankAccountProfile = {
  user_id: number
  bank_code: string
  bank_account_number: string
  account_name: string
  is_verified: boolean
  verified_at: string | null
}

export type CryptoPayoutProfile = {
  user_id: number
  first_name: string
  last_name: string
  crypto_currency: string
  crypto_address: string
}

export type KycRequestItem = {
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
}

export type KycUploadUrlResponse = {
  upload_url: string
  public_url: string | null
  key: string
}

export type KycUploadProxyResponse = {
  public_url: string | null
  key: string
}

export type KycHistoryResponse = {
  requests: KycRequestItem[]
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
  currency?: string
  challenge_type?: string
  phase: string
  objective_status: string
  display_status: string
  is_active: boolean
  mt5_account: string | null
  platform?: string
  has_pending_withdrawal?: boolean
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
  daily_breach_balance?: number
  profit_target_balance: number
  win_rate: number
  closed_trades_count: number
  winning_trades_count: number
  lots_traded_total: number
  today_closed_pnl: number
  today_trades_count: number
  today_lots_total: number
  min_trading_days_required: number
  processed_trade_ids?: string[]
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

export type TradingObjectivesResponse = {
  rules?: Record<string, unknown>
}

export type UserChallengeAccountDetailResponse = {
  challenge_id: string
  account_size: string
  currency?: string
  challenge_type?: string
  platform?: string
  initial_balance?: number
  phase: string
  objective_status: string
  has_pending_withdrawal?: boolean
  pending_withdrawal_amount?: number | null
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
  account_size: string
  currency: string
  challenge_type?: string
  phase?: string
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
  bank_transfer_amount_ngn?: number | null
  bank_transfer_rate?: number | null
  plan_id: string
  account_size: string
  challenge_type?: string
  phase?: string
  coupon_code: string | null
  checkout_url: string | null
  payer_bank_name: string | null
  payer_account_name: string | null
  payer_virtual_acc_no: string | null
  expires_at: string | null
  challenge_id: string | null
  crypto_currency?: string | null
  crypto_address?: string | null
  crypto_networks?: {
    ERC20?: string | null
    SOL?: string | null
    TRC20?: string | null
  } | null
}

export type PaymentStatusRefreshResponse = {
  provider_order_id: string
  status: string
  assignment_status: string
  challenge_id: string | null
  message: string
}

export type TraderOrder = {
  id: number
  provider_order_id: string
  status: string
  assignment_status: string
  account_size: string
  net_amount_kobo: number
  net_amount_formatted: string
  payment_method: string
  payment_provider: string
  created_at: string
  paid_at: string | null
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

export async function fetchCurrentUser(): Promise<AuthMeResponse> {
  const cached = getPersistedAuthUser()
  if (cached) return cached
  const profile = await apiFetch<AuthMeResponse>('/trader/me')
  persistAuthUser(profile)
  return profile
}

export async function loginWithBackend(): Promise<AuthMeResponse> {
  const user = await apiFetch<AuthMeResponse>('/trader/me')
  persistAuthUser(user)
  return user
}

export async function logoutFromBackend(): Promise<void> {
  localStorage.removeItem(MOCK_USER_KEY)
  localStorage.removeItem('supabase_access_token')
}

export async function fetchProfile(): Promise<AuthMeResponse> {
  try {
    const profile = await apiFetch<AuthMeResponse>('/trader/me')
    persistAuthUser(profile)
    return profile
  } catch (error) {
    const cached = getPersistedAuthUser()
    if (cached) {
      return cached
    }
    throw error
  }
}

export async function updateProfile(payload: { first_name?: string; last_name?: string; nick_name?: string | null; use_nickname_for_certificates?: boolean; overall_reward_currency?: string }): Promise<AuthMeResponse> {
  const response = await apiFetch<AuthMeResponse>('/trader/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  persistAuthUser(response)
  return response
}

export async function updateCertificateNameSetting(use_nickname: boolean): Promise<{ use_nickname_for_certificates: boolean }> {
  const response = await apiFetch<AuthMeResponse>('/trader/me', {
    method: 'PATCH',
    body: JSON.stringify({ use_nickname_for_certificates: use_nickname }),
  })
  persistAuthUser(response)
  return { use_nickname_for_certificates: response.use_nickname_for_certificates ?? false }
}

export async function updateOverallRewardCurrency(currency: 'USD' | 'NGN'): Promise<{ overall_reward_currency: string }> {
  const response = await apiFetch<AuthMeResponse>('/trader/me', {
    method: 'PATCH',
    body: JSON.stringify({ overall_reward_currency: currency }),
  })
  persistAuthUser(response)
  return { overall_reward_currency: response.overall_reward_currency ?? 'USD' }
}

export async function fetchBankList(): Promise<{ banks: BankListItem[] }> {
  return apiFetch<{ banks: BankListItem[] }>('/kyc/banks')
}

export async function resolveKycAccountName(payload: {
  bank_code: string
  bank_account_number: string
}): Promise<{ bank_code: string; bank_account_number: string; account_name: string; safehaven?: unknown }> {
  return apiFetch<{ bank_code: string; bank_account_number: string; account_name: string; safehaven?: unknown }>(
    '/kyc/resolve-bank',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

export async function saveCryptoPayout(payload: {
  crypto_currency: string
  crypto_address: string
  first_name: string
  last_name: string
}): Promise<{ crypto_currency: string; crypto_address: string; first_name?: string; last_name?: string }> {
  return apiFetch<{ crypto_currency: string; crypto_address: string; first_name?: string; last_name?: string }>(
    '/kyc/save-crypto',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

export async function createKycUploadUrl(payload: {
  filename: string
  content_type: string
  document_side: 'front' | 'back'
}): Promise<KycUploadUrlResponse> {
  return apiFetch<KycUploadUrlResponse>('/kyc/upload-url', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function uploadKycDocument(payload: {
  filename: string
  content_type: string
  document_side: 'front' | 'back'
  file_base64: string
}): Promise<KycUploadProxyResponse> {
  return apiFetch<KycUploadProxyResponse>('/kyc/upload', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function submitKyc(payload: {
  document_type: string
  document_number: string
  id_front_url: string
  id_back_url?: string | null
  selfie_url?: string | null
}): Promise<{ status: string; message: string; kyc_status: string }> {
  const response = await apiFetch<{ status: string; message: string; kyc_status: string }>(
    '/kyc/submit',
    {
      method: 'POST',
      body: JSON.stringify({
        document_type: payload.document_type,
        document_number: payload.document_number,
        id_front_url: payload.id_front_url,
        id_back_url: payload.id_back_url ?? null,
        selfie_url: payload.selfie_url ?? null,
      }),
    }
  )
  return response
}

export async function fetchBankAccountProfile(): Promise<BankAccountProfile | null> {
  const profile = await fetchProfile()
  if (!profile.payout_bank_code || !profile.payout_account_number || !profile.payout_account_name) {
    return null
  }
  return {
    user_id: profile.id,
    bank_code: profile.payout_bank_code,
    bank_account_number: profile.payout_account_number,
    account_name: profile.payout_account_name,
    is_verified: Boolean(profile.payout_verified_at),
    verified_at: profile.payout_verified_at ?? null,
  }
}

export async function fetchCryptoPayoutProfile(): Promise<CryptoPayoutProfile | null> {
  const profile = await fetchProfile()
  if (!profile.payout_crypto_currency || !profile.payout_crypto_address) {
    return null
  }
  return {
    user_id: profile.id,
    first_name: profile.payout_crypto_first_name ?? '',
    last_name: profile.payout_crypto_last_name ?? '',
    crypto_currency: profile.payout_crypto_currency,
    crypto_address: profile.payout_crypto_address,
  }
}

export async function fetchKycEligibility(): Promise<KycEligibilityResponse> {
  return apiFetch<KycEligibilityResponse>('/kyc/eligibility')
}

export async function fetchKycHistory(): Promise<KycHistoryResponse> {
  return apiFetch<KycHistoryResponse>('/kyc/history')
}

export async function fetchWithdrawalPrecheck(): Promise<WithdrawalPrecheckResponse> {
  return apiFetch<WithdrawalPrecheckResponse>('/payouts/precheck')
}

export async function fetchUserChallengeAccounts(): Promise<UserChallengeAccountListResponse> {
  return apiFetch<UserChallengeAccountListResponse>('/trader/challenges')
}

export async function fetchUserChallengeAccountDetail(challengeId: string): Promise<UserChallengeAccountDetailResponse> {
  return apiFetch<UserChallengeAccountDetailResponse>(`/trader/challenges/${encodeURIComponent(challengeId)}`)
}

export async function fetchTradingObjectives(): Promise<TradingObjectivesResponse> {
  return apiFetch<TradingObjectivesResponse>('/trading-objectives')
}

export async function refreshChallengeAccount(): Promise<{ status: string }> {
  return apiFetch<{ status: string; requested_at?: string }>('/trader/challenges/refresh', {
    method: 'POST',
  })
}

export async function fetchPublicChallengePlans(): Promise<PublicChallengePlan[]> {
  const response = await apiFetch<{ plans: PublicChallengePlan[] }>('/public/plans')
  return response.plans
}

export async function previewCheckoutCoupon(payload: {
  code: string
  plan_id: string
  amount_kobo: number
  challenge_type?: string
}): Promise<CheckoutCouponPreviewResponse> {
  return apiFetch<CheckoutCouponPreviewResponse>('/coupons/preview', {
    method: 'POST',
    body: JSON.stringify({
      code: payload.code,
      plan_id: payload.plan_id,
      amount_kobo: payload.amount_kobo,
      challenge_type: payload.challenge_type,
    }),
  })
}

export async function initPalmPayBankTransfer(payload: {
  plan_id: string
  account_size: string
  amount_kobo: number
  coupon_code?: string | null
  challenge_type: string
  phase: string
  platform: string
}): Promise<PaymentOrderResponse> {
  return apiFetch<PaymentOrderResponse>('/trader/orders/bank-transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function initCryptoOrder(payload: {
  plan_id: string
  account_size: string
  amount_kobo: number
  crypto_currency: string
  coupon_code?: string | null
  challenge_type: string
  phase: string
  platform: string
}): Promise<PaymentOrderResponse> {
  return apiFetch<PaymentOrderResponse>('/trader/orders/crypto', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function initFreeOrder(payload: {
  plan_id: string
  account_size: string
  amount_kobo: number
  coupon_code?: string | null
  challenge_type: string
  phase: string
  platform: string
}): Promise<PaymentOrderResponse> {
  return apiFetch<PaymentOrderResponse>('/trader/orders/free', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function refreshPaymentOrderStatus(providerOrderId: string): Promise<PaymentStatusRefreshResponse> {
  return apiFetch<PaymentStatusRefreshResponse>(
    `/trader/orders/${encodeURIComponent(providerOrderId)}`
  )
}

export async function fetchOrders(
  page: number = 1,
  pageSize: number = 5,
): Promise<{ orders: TraderOrder[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(pageSize))
  return apiFetch<{ orders: TraderOrder[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/trader/orders?${params.toString()}`
  )
}

export async function fetchCertificates(): Promise<CertificateListResponse> {
  return apiFetch<CertificateListResponse>('/trader/certificates')
}

export async function fetchPublicCoupons(): Promise<{ coupons: PublicCouponResponse[] }> {
  return apiFetch<{ coupons: PublicCouponResponse[] }>('/coupons/public')
}

export function persistAuthUser(user: AuthMeResponse): void {
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user))
}

export function getPersistedAuthUser(): AuthMeResponse | null {
  const raw = localStorage.getItem(MOCK_USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthMeResponse
  } catch {
    return null
  }
}

export function clearPersistedAuthUser(): void {
  localStorage.removeItem(MOCK_USER_KEY)
}
