import { apiFetch } from '../lib/api'
import { getAffiliateEarningsCurrencyPreference } from './traderAuth'

export type AffiliateStats = {
  available_balance: number
  total_earned: number
  referrals: number
  impressions: number
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
  commission_percent?: number
  display_currency?: 'USD' | 'NGN'
  stats: AffiliateStats
  recent_transactions: AffiliateTransaction[]
  recent_payouts: AffiliatePayoutHistory[]
  bank_details?: BankDetails
  payout_method_type?: string | null
}


export async function fetchAffiliateDashboard(): Promise<AffiliateDashboard> {
  const currency = getAffiliateEarningsCurrencyPreference()
  return apiFetch<AffiliateDashboard>(`/trader/affiliate/summary?scope=trader&currency=${currency}`)
}

export async function requestAffiliatePayout(): Promise<{ message: string }> {
  return apiFetch<{ message: string; amount: number; status: string }>('/trader/affiliate/payouts?scope=trader', {
    method: 'POST',
  })
}