import axios from 'axios'
import { config } from './config'
import { MetricsPayload, TradePayload } from './types'
import { CTraderDeal } from './types'

const backendClient = axios.create({
  baseURL: config.backendBaseUrl,
  timeout: 15000,
})

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