export type FinanceEventType = 'PHASE_PASS' | 'WITHDRAW_REQUEST' | 'WITHDRAWAL' | 'ADJUST_BALANCE'

export type FinanceEventPayload = {
  type: FinanceEventType
  account: string
  accountSize?: string | null
  accountType?: string | null
  platform?: string
  profit?: number
  targetBalance?: number
  amount?: number
  currentBalance?: number | null
  profitSplitPercent?: number | null
  reason?: string
  currentPhase?: string
  nextPhase?: string
  challengeType?: string
  ownerEmail?: string
  resetCommand?: string
}

export type BackendResponse = {
  status: string
  message?: string
}