const mockDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

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

const mockDashboard: AffiliateDashboard = {
  referral_link: 'https://machefunded.com/ref/ALX001',
  stats: {
    available_balance: 125000,
    total_earned: 420000,
    referrals: 38,
    impressions: 1200,
  },
  rewards: [
    { amount: 5000, status: 'live', progress: 6, target: 10, remaining: 4 },
    { amount: 10000, status: 'locked', progress: 3, target: 15, remaining: 12 },
    { amount: 25000, status: 'claimed', progress: 15, target: 15, remaining: 0 },
  ],
  recent_transactions: [
    { date: 'Mar 01, 2026', type: 'Referral Commission', commission: 15000 },
    { date: 'Feb 20, 2026', type: 'Referral Commission', commission: 8000 },
  ],
  recent_payouts: [
    { date: 'Feb 10, 2026', status: 'Completed', amount: 50000 },
    { date: 'Jan 05, 2026', status: 'Pending', amount: 25000 },
  ],
  bank_details: {
    bank_name: 'Mock Bank',
    account_name: 'Alex Trader',
    account_number: '1234567890',
  },
}

export async function fetchAffiliateDashboard(): Promise<AffiliateDashboard> {
  await mockDelay()
  return mockDashboard
}

export async function requestAffiliatePayout(amount: number): Promise<{ message: string }> {
  await mockDelay(200)
  return { message: `Mock payout request submitted for $${amount.toLocaleString('en-US')}` }
}

export async function claimMilestoneReward(levelIndex: number): Promise<{ message: string }> {
  await mockDelay()
  return { message: `Mock reward claimed for level ${levelIndex + 1}` }
}

export async function updateBankDetails(bankDetails: BankDetailsUpdate): Promise<{ message: string }> {
  await mockDelay()
  return { message: `Mock bank details saved for ${bankDetails.account_name}` }
}

export async function attachAffiliateAttribution(payload: AffiliateAttributionRequest): Promise<{ message: string }> {
  await mockDelay(100)
  return { message: `Mock attribution stored for ${payload.affiliate_code}` }
}