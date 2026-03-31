import axios from 'axios'
import { config } from './config'
import { MetricsPayload, PositionPayload, TradePayload } from './types'

const backendClient = axios.create({
  baseURL: config.backendBaseUrl,
  timeout: 15000,
})

const requestWithRetry = async <T>(request: () => Promise<T>, label: string, retries = 2) => {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await request()
    } catch (error) {
      lastError = error
      if (attempt >= retries) {
        break
      }
      const backoffMs = 1000 * Math.pow(2, attempt)
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }
  throw lastError ?? new Error(`[metrics] ${label} failed`)
}

export type ActiveAccountSnapshot = {
  accountNumber: string
  balance?: number
  status?: string
  phase?: string
  challengeType?: string
}

export const fetchActiveAccounts = async () => {
  const activePath = config.backendActiveAccountsPath ?? '/api/v1/ctrader/active-accounts'
  const response = await requestWithRetry(
    () => backendClient.get<ActiveAccountSnapshot[]>(activePath, {
      headers: {
        'Content-Type': 'application/json',
        'X-ENGINE-SECRET': config.backendEngineSecret,
      },
    }),
    'active-accounts'
  )
  return response.data ?? []
}

export const publishMetrics = async (payload: MetricsPayload) => {
  const metricsPath = config.backendMetricsPath ?? '/api/v1/ctrader/metrics'
  await requestWithRetry(
    () => backendClient.post(metricsPath, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-ENGINE-SECRET': config.backendEngineSecret,
      },
    }),
    'publish-metrics'
  )
}

export const buildMetricsPayload = (params: {
  accountNumber: string
  balance: number
  equity: number
  trades?: TradePayload[]
  positions?: PositionPayload[]
  timestamp?: string
}): MetricsPayload => ({
  account_number: params.accountNumber,
  balance: params.balance,
  equity: params.equity,
  trades: params.trades,
  positions: params.positions,
  timestamp: params.timestamp,
})