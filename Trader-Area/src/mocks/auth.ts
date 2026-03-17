import { apiFetch } from '../lib/api'

const MOCK_USER_KEY = 'nairatrader_auth_user'
const mockDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

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
  challenge_type?: string
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
  bank_transfer_amount_ngn?: number | null
  bank_transfer_rate?: number | null
  plan_id: string
  account_size: string
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
  await mockDelay()
  const cached = getPersistedAuthUser()
  if (cached) return cached
  return {
    id: 101,
    descope_user_id: 'mock-user-101',
    email: 'trader@machefunded.com',
    full_name: 'Alex Trader',
    nick_name: 'ProTrader',
    role: 'trader',
    status: 'active',
    kyc_status: 'verified',
    use_nickname_for_certificates: true,
  }
}

export async function loginWithBackend(): Promise<AuthMeResponse> {
  const user = await fetchCurrentUser()
  persistAuthUser(user)
  return user
}

export async function logoutFromBackend(): Promise<void> {
  await mockDelay(100)
}

export async function fetchProfile(): Promise<AuthMeResponse> {
  return fetchCurrentUser()
}

export async function updateProfile(payload: { full_name?: string; nick_name?: string }): Promise<AuthMeResponse> {
  const current = await fetchCurrentUser()
  const updated: AuthMeResponse = {
    ...current,
    full_name: payload.full_name ?? current.full_name,
    nick_name: payload.nick_name ?? current.nick_name ?? null,
  }
  persistAuthUser(updated)
  return updated
}

export async function updateCertificateNameSetting(use_nickname: boolean): Promise<{ use_nickname_for_certificates: boolean }> {
  const current = await fetchCurrentUser()
  const updated = { ...current, use_nickname_for_certificates: use_nickname }
  persistAuthUser(updated)
  return { use_nickname_for_certificates: use_nickname }
}

type AuthorizedRequestInit = RequestInit & { headers?: Record<string, string> }
async function authFetch(_path: string, _init: AuthorizedRequestInit = {}): Promise<Response> {
  await mockDelay(200)
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

export async function getPinStatus(): Promise<{ has_pin: boolean }> {
  await mockDelay()
  return { has_pin: true }
}

export async function sendPinOtp(purpose: 'set' | 'reset'): Promise<{ message: string }> {
  await mockDelay()
  return { message: `Mock OTP sent for ${purpose} PIN` }
}

export async function setPin(payload: { new_pin: string; confirm_pin: string; otp: string }): Promise<{ message: string }> {
  await mockDelay()
  return { message: `Mock PIN set with ${payload.new_pin}` }
}

export async function changePin(payload: { old_pin: string; new_pin: string }): Promise<{ message: string }> {
  await mockDelay()
  return { message: `Mock PIN changed from ${payload.old_pin}` }
}

export async function resetPin(payload: { otp: string; new_pin: string; confirm_pin: string }): Promise<{ message: string }> {
  await mockDelay()
  return { message: `Mock PIN reset with ${payload.new_pin}` }
}

export async function fetchBankList(): Promise<{ banks: BankListItem[] }> {
  await mockDelay()
  return {
    banks: [
      { bank_code: '001', bank_name: 'Mock Bank' },
      { bank_code: '002', bank_name: 'Demo Savings' },
    ],
  }
}

export async function resolveKycAccountName(payload: {
  bank_code: string
  bank_account_number: string
}): Promise<{ bank_code: string; bank_account_number: string; account_name: string }> {
  await mockDelay()
  return {
    bank_code: payload.bank_code,
    bank_account_number: payload.bank_account_number,
    account_name: 'Mock Trader',
  }
}

export async function submitKyc(payload: {
  document_type: string
  document_number: string
  id_front: File
  id_back?: File | null
  selfie: File
}): Promise<{ status: string; message: string; kyc_status: string }> {
  await mockDelay()
  return {
    status: 'success',
    message: `Mock KYC submitted for ${payload.document_type.replace('_', ' ')}`,
    kyc_status: 'pending',
  }
}

export async function fetchBankAccountProfile(): Promise<BankAccountProfile | null> {
  await mockDelay()
  return {
    user_id: 101,
    bank_code: '001',
    bank_account_number: '1234567890',
    account_name: 'Mock Trader',
    is_verified: true,
    verified_at: new Date().toISOString(),
  }
}

export async function fetchKycEligibility(): Promise<KycEligibilityResponse> {
  await mockDelay()
  return { eligible: true, message: 'Mock KYC eligible' }
}

export async function fetchWithdrawalPrecheck(): Promise<WithdrawalPrecheckResponse> {
  await mockDelay()
  return {
    kyc_completed: true,
    bank_account_verified: true,
    has_funded_account: true,
    eligible_for_withdrawal: true,
    message: 'Eligible for withdrawal (mock)',
    payout_destination: await fetchBankAccountProfile(),
  }
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
  await mockDelay()
  return { status: 'refreshed' }
}

export async function fetchPublicChallengePlans(): Promise<PublicChallengePlan[]> {
  await mockDelay()
  return [
    {
      id: 'starter',
      name: 'Starter Challenge',
      price: '$25,000',
      max_drawdown: '10%',
      profit_target: '8%',
      phases: '2',
      min_trading_days: '5',
      profit_split: '80%',
      profit_cap: 'None',
      payout_frequency: 'Bi-weekly',
      status: 'Available',
      enabled: true,
    },
  ]
}

export async function previewCheckoutCoupon(payload: {
  code: string
  plan_id: string
}): Promise<CheckoutCouponPreviewResponse> {
  await mockDelay()
  return {
    code: payload.code,
    plan_id: payload.plan_id,
    original_amount: 25000,
    discount_amount: 2500,
    final_amount: 22500,
    formatted_original_amount: '$25,000',
    formatted_discount_amount: '$2,500',
    formatted_final_amount: '$22,500',
  }
}

export async function initPalmPayBankTransfer(payload: {
  plan_id: string
  account_size: string
  amount_kobo: number
  coupon_code?: string | null
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
}): Promise<PaymentOrderResponse> {
  return apiFetch<PaymentOrderResponse>('/trader/orders/crypto', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function refreshPaymentOrderStatus(providerOrderId: string): Promise<PaymentStatusRefreshResponse> {
  await mockDelay()
  return {
    provider_order_id: providerOrderId,
    status: 'processing',
    assignment_status: 'assigned',
    challenge_id: 'mock-challenge-001',
    message: 'Mock status refreshed',
  }
}

export async function fetchOrders(): Promise<{ orders: TraderOrder[] }> {
  return apiFetch<{ orders: TraderOrder[] }>('/trader/orders')
}

export async function fetchCertificates(): Promise<CertificateListResponse> {
  await mockDelay()
  return {
    certificates: [
      {
        id: 1,
        certificate_type: 'Challenge',
        title: 'MacheFunded Challenge Completion',
        description: 'Awarded for successful completion of the challenge',
        certificate_url: '/mock-certificate.pdf',
        generated_at: new Date().toISOString(),
        related_entity_id: 'mock-challenge-001',
        certificate_metadata: null,
      },
    ],
  }
}

export async function fetchPublicCoupons(): Promise<{ coupons: PublicCouponResponse[] }> {
  await mockDelay()
  return {
    coupons: [
      {
        id: 1,
        code: 'MOCK10',
        discount_type: 'percent',
        discount_value: 10,
        is_active: true,
        expires_at: null,
        max_uses: null,
        used_count: 0,
        applicable_plan_ids: ['starter'],
        applies_to_all_plans: false,
        status: 'active',
      },
    ],
  }
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
