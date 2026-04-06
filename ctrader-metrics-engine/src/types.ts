export type TradePayload = {
  ticket?: string
  position_id?: string
  open_time?: string
  close_time?: string
  profit?: number
  dealType?: string
}

export type PositionPayload = {
  position_id: string
  symbol_id: string
  volume: number
  entry_price: number
  open_time?: string
  close_time?: string
  trade_side: 'BUY' | 'SELL'
  is_open: boolean
}

export type MetricsPayload = {
  account_number: string
  platform?: string
  balance: number
  equity: number
  trades?: TradePayload[]
  positions?: PositionPayload[]
  timestamp?: string
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
  unrealizedPnl?: number
}

export type CTraderDeal = {
  dealId: string
  positionId?: string
  volume?: number
  profit?: number
  openTime?: string
  closeTime?: string
}