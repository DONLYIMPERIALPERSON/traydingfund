const mockDelay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms))

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
  mt5_account_number?: string | null
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
  async getPayoutSummary(): Promise<PayoutSummaryResponse> {
    await mockDelay()
    return {
      total_available_payout: 125000,
      total_earned_all_time: 540000,
      funded_accounts: [
        {
          account_id: 1,
          challenge_id: 'mock-challenge-001',
          account_size: '$50K',
          current_balance: 53500,
          available_payout: 120000,
          profit_cap_amount: 500000,
          profit_split_percent: 80,
          minimum_withdrawal_amount: 10000,
          withdrawal_count: 2,
          last_withdrawal_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
      withdrawal_history: [
        {
          id: 1,
          amount: 50000,
          status: 'completed',
          requested_at: new Date(Date.now() - 86400000).toISOString(),
          completed_at: new Date(Date.now() - 86000000).toISOString(),
          reference: 'MOCK-REF-001',
          mt5_account_number: '12345678',
        },
      ],
      eligibility: {
        is_eligible: true,
        has_verified_bank_account: true,
        has_available_payout: true,
        minimum_payout_amount: 10000,
        bank_account_masked: '7890',
        ineligibility_reasons: [],
      },
    }
  }

  async checkEligibility(): Promise<PayoutEligibilityResponse> {
    await mockDelay()
    return {
      eligible: true,
      has_bank_account: true,
      has_funded_accounts: true,
      available_payout: 120000,
      reasons: [],
    }
  }

  async requestPayout(accountId: number, pin: string): Promise<{ request_id: string; amount: number; status: string; estimated_completion: string; message: string }> {
    await mockDelay()
    return {
      request_id: `mock-request-${accountId}`,
      amount: 50000,
      status: 'processing',
      estimated_completion: new Date(Date.now() + 3600000).toISOString(),
      message: `Mock payout requested for account ${accountId} with pin ${pin}`,
    }
  }
}

export const payoutAPI = new PayoutAPI()

// Utility functions for formatting
export const formatCurrency = (amount: number): string => {
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