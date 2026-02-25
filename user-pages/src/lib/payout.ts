import { getSessionToken } from '@descope/react-sdk'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL

export interface FundedAccountPayout {
  account_id: number;
  challenge_id: string;
  account_size: string;
  current_balance: number;
  available_payout: number;
  profit_cap_amount: number;
  profit_split_percent: number;
  minimum_withdrawal_amount: number;
  withdrawal_count: number;
  last_withdrawal_at: string | null;
}

export interface WithdrawalHistory {
  id: number
  amount: number
  status: string
  requested_at: string
  completed_at: string | null
  reference: string
}

export interface PayoutEligibility {
  is_eligible: boolean
  has_verified_bank_account: boolean
  has_available_payout: boolean
  minimum_payout_amount: number
  bank_account_masked: string | null
  ineligibility_reasons: string[]
}

export interface PayoutSummaryResponse {
  total_available_payout: number
  total_earned_all_time: number
  funded_accounts: FundedAccountPayout[]
  withdrawal_history: WithdrawalHistory[]
  eligibility: PayoutEligibility
}

export interface PayoutEligibilityResponse {
  eligible: boolean
  has_bank_account: boolean
  has_funded_accounts: boolean
  available_payout: number
  reasons: string[]
}

class PayoutAPI {
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = getSessionToken()
    if (!token) {
      throw new Error('No authentication token available')
    }

    const url = `${API_BASE_URL}${endpoint}`
    const config: RequestInit = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  async getPayoutSummary(): Promise<PayoutSummaryResponse> {
    return this.request('/payout/summary')
  }

  async checkEligibility(): Promise<PayoutEligibilityResponse> {
    return this.request('/payout/eligibility')
  }

  async requestPayout(accountId: number): Promise<{ request_id: string; amount: number; status: string; estimated_completion: string; message: string }> {
    return this.request('/payout/request', {
      method: 'POST',
      body: JSON.stringify({
        account_id: accountId,
      }),
    })
  }
}

export const payoutAPI = new PayoutAPI()

// Utility functions for formatting
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amount).replace('NGN', '₦')
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const formatTimeAgo = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) {
    return 'Just now'
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }
}