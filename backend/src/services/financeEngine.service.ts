import { env } from '../config/env'

export type FinanceEventType = 'PHASE_PASS' | 'WITHDRAW_REQUEST' | 'WITHDRAWAL' | 'ADJUST_BALANCE'

export type FinanceEventPayload = {
  type: FinanceEventType
  account: string
  profit?: number
  targetBalance?: number
  amount?: number
  reason?: string
  currentPhase?: string
  nextPhase?: string
  challengeType?: string
  ownerEmail?: string
  resetCommand?: string
}

const buildUrl = (path: string) => {
  const base = env.financeEngineBaseUrl
  if (!base) return null
  return `${base.replace(/\/$/, '')}${path}`
}

const postToFinanceEngine = async (path: string, body: Record<string, unknown>) => {
  const url = buildUrl(path)
  if (!url) {
    return { skipped: true }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.financeEngineApiKey ? { 'x-finance-engine-key': env.financeEngineApiKey } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Finance engine request failed (${response.status})`)
  }

  return response.json().catch(() => ({}))
}

export const notifyFinanceEngine = async (payload: FinanceEventPayload) => {
  return postToFinanceEngine('/finance-engine/event', payload)
}