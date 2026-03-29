import axios from 'axios'
import { config } from './config'
import { MetricsPayload, TradePayload } from './types'
import { CTraderDeal } from './types'

const backendClient = axios.create({
  baseURL: config.backendBaseUrl,
  timeout: 15000,
})

export type ActiveAccountSnapshot = {
  accountNumber: string
  balance?: number
  status?: string
  phase?: string
  challengeType?: string
}

export const fetchActiveAccounts = async () => {
  const response = await backendClient.get<ActiveAccountSnapshot[]>(config.backendActiveAccountsPath, {
    headers: {
      'Content-Type': 'application/json',
      'X-ENGINE-SECRET': config.backendEngineSecret,
    },
  })
  return response.data ?? []
}

const mapDealToTrade = (deal: CTraderDeal): TradePayload => ({
  ticket: deal.dealId,
  open_time: deal.openTime,
  close_time: deal.closeTime,
  profit: deal.profit,
})

export const publishMetrics = async (payload: MetricsPayload) => {
  const url = config.backendMetricsPath
  await backendClient.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-ENGINE-SECRET': config.backendEngineSecret,
    },
  })
}

export const buildMetricsPayload = (params: {
  accountNumber: string
  balance: number
  equity: number
  deals: CTraderDeal[]
}): MetricsPayload => ({
  account_number: params.accountNumber,
  balance: params.balance,
  equity: params.equity,
  trades: params.deals.map(mapDealToTrade),
})