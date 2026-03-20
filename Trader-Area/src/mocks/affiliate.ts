import { apiFetch } from '../lib/api'

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

export async function fetchAffiliateDashboard(): Promise<AffiliateDashboard> {
  return apiFetch<AffiliateDashboard>('/trader/affiliate/summary')
}

export async function requestAffiliatePayout(amount: number): Promise<{ message: string }> {
  return apiFetch<{ message: string; amount: number; status: string }>('/trader/affiliate/payouts', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })
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