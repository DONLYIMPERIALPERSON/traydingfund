import { apiFetch } from '../lib/api'

export interface FundedAccountPayout {
  account_id: number;
  challenge_id: string;
  account_size: string;
  currency?: string;
  current_balance: number;
  available_payout: number;
  profit_cap_amount: number;
  profit_split_percent: number;
  minimum_withdrawal_amount: number;
  withdrawal_count: number;
  last_withdrawal_at: string | null;
  next_withdrawal_at?: string | null;
  withdrawal_schedule?: string | null;
  has_pending_request?: boolean;
}

export interface WithdrawalHistory {
  id: number
  amount: number
  currency?: string | null
  status: string
  requested_at: string
  completed_at: string | null
  reference: string
  decline_reason?: string | null
  mt5_account_number?: string | null
}

export interface PayoutEligibility {
  is_eligible: boolean
  kyc_verified?: boolean
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
  payout_method?: {
    payout_method_type: string | null
    payout_bank_name: string | null
    payout_bank_code: string | null
    payout_account_number: string | null
    payout_account_name: string | null
    payout_crypto_currency: string | null
    payout_crypto_address: string | null
    payout_crypto_first_name?: string | null
    payout_crypto_last_name?: string | null
  }
}

export interface OverallRewardCertificate {
  certificate_url: string
  total_reward: number
  currency: string
  generated_at: string
}

export interface PayoutEligibilityResponse {
  eligible: boolean
  kyc_verified?: boolean
  has_bank_account: boolean
  has_funded_accounts: boolean
  available_payout: number
  reasons: string[]
}

class PayoutAPI {
  async getPayoutSummary(): Promise<PayoutSummaryResponse> {
    return apiFetch<PayoutSummaryResponse>('/payouts/summary')
  }

  async checkEligibility(): Promise<PayoutEligibilityResponse> {
    const summary = await apiFetch<PayoutSummaryResponse>('/payouts/summary')
    return {
      eligible: summary.eligibility.is_eligible,
      kyc_verified: summary.eligibility.kyc_verified,
      has_bank_account: summary.eligibility.has_verified_bank_account,
      has_funded_accounts: summary.funded_accounts.length > 0,
      available_payout: summary.total_available_payout,
      reasons: summary.eligibility.ineligibility_reasons,
    }
  }

  async requestPayout(accountId: number): Promise<{ request_id: string; amount: number; status: string; estimated_completion: string; message: string }> {
    return apiFetch<{ request_id: string; amount: number; status: string; estimated_completion: string; message: string }>(
      '/payouts/request',
      {
        method: 'POST',
        body: JSON.stringify({ account_id: accountId }),
      }
    )
  }

  async fetchOverallRewardCertificate(): Promise<OverallRewardCertificate> {
    return apiFetch<OverallRewardCertificate>('/payouts/overall-reward-certificate')
  }
}

export const payoutAPI = new PayoutAPI()

// Utility functions for formatting
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  const normalizedCurrency = String(currency).toUpperCase() === 'NGN' ? 'NGN' : 'USD'

  if (normalizedCurrency === 'NGN') {
    return `₦${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
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