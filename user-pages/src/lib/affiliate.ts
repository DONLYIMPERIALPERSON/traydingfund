import { getSessionToken } from '@descope/react-sdk'

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL

if (!BACKEND_BASE_URL) {
  throw new Error('VITE_BACKEND_URL is required')
}

export type AffiliateStats = {
  available_balance: number
  total_earned: number
  referrals: number
  impressions: number
}

export type AffiliateReward = {
  amount: number
  status: 'live' | 'locked' | 'claimed'
  progress?: number
  target?: number
  remaining?: number
}

export type AffiliateTransaction = {
  date: string
  type: string
  commission: number
}

export type AffiliatePayoutHistory = {
  date: string
  status: string
  amount: number
}

export type BankDetails = {
  bank_name: string
  account_name: string
  account_number: string
}

export type AffiliateDashboard = {
  referral_link: string
  stats: AffiliateStats
  rewards: AffiliateReward[]
  recent_transactions: AffiliateTransaction[]
  recent_payouts: AffiliatePayoutHistory[]
  bank_details?: BankDetails
}

export type PayoutRequest = {
  amount: number
}

export type MilestoneClaimRequest = {
  level_index: number
}

export type BankDetailsUpdate = {
  bank_code: string
  account_name: string
  account_number: string
}

export type AffiliateAttributionRequest = {
  affiliate_code: string
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

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getSessionToken()
  if (!token) {
    throw new Error('No Descope session token available')
  }

  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  if (response.status === 401) {
    // Handle unauthorized - redirect to login
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.replace('/login')
    }
  }

  return response
}

export async function fetchAffiliateDashboard(): Promise<AffiliateDashboard> {
  const response = await authFetch('/affiliate/dashboard')

  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Affiliate dashboard fetch failed', response.status, errorText)
  }

  return response.json() as Promise<AffiliateDashboard>
}

export async function requestAffiliatePayout(amount: number): Promise<{ message: string }> {
  const response = await authFetch('/affiliate/payout/request', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Payout request failed', response.status, errorText)
  }

  return response.json() as Promise<{ message: string }>
}

export async function claimMilestoneReward(levelIndex: number): Promise<{ message: string }> {
  const response = await authFetch('/affiliate/milestone/claim', {
    method: 'POST',
    body: JSON.stringify({ level_index: levelIndex }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Milestone claim failed', response.status, errorText)
  }

  return response.json() as Promise<{ message: string }>
}

export async function updateBankDetails(bankDetails: BankDetailsUpdate): Promise<{ message: string }> {
  const response = await authFetch('/affiliate/bank-details', {
    method: 'PUT',
    body: JSON.stringify(bankDetails),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Bank details update failed', response.status, errorText)
  }

  return response.json() as Promise<{ message: string }>
}

export async function attachAffiliateAttribution(payload: AffiliateAttributionRequest): Promise<{ message: string }> {
  const response = await authFetch('/affiliate/attribution', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw parseBackendError('Affiliate attribution failed', response.status, errorText)
  }

  return response.json() as Promise<{ message: string }>
}