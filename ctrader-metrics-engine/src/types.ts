export type TradePayload = {
  ticket?: string
  open_time?: string
  close_time?: string
  profit?: number
}

export type MetricsPayload = {
  account_number: string
  balance: number
  equity: number
  trades?: TradePayload[]
}

export type CTraderStreamState = {
  status: 'connected' | 'closed' | 'error'
  error?: unknown
}

export type CTraderAccountSnapshot = {
  accountId: string
  accountNumber: string
  balance: number
  equity: number
}

export type CTraderDeal = {
  dealId: string
  positionId?: string
  volume?: number
  profit?: number
  openTime?: string
  closeTime?: string
}