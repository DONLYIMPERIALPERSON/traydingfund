import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

const must = (key: string) => {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

const optional = (key: string, fallback?: string) => process.env[key] ?? fallback

const parseList = (value?: string) =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toUpperCase()) ?? []

const DEFAULT_SYMBOLS = [
  'EURUSD','GBPUSD','AUDUSD','NZDUSD','USDJPY','USDCAD','USDCHF','EURGBP','EURJPY','GBPJPY','AUDJPY','NZDJPY','EURCHF','GBPCHF','CADJPY','CHFJPY','EURAUD','XAUUSD','XAGUSD','XPTUSD','US30','US500','USTEC','UK100','DE30','FRA40','JP225','BTCUSD','ETHUSD','USOIL','UKOIL',
]

export const config = {
  wsUrl: optional('CTRADER_WS_URL', 'wss://demo.ctraderapi.com:5035')!,
  clientId: must('CTRADER_CLIENT_ID'),
  clientSecret: must('CTRADER_CLIENT_SECRET'),
  accessToken: must('CTRADER_ACCESS_TOKEN'),
  symbols: parseList(optional('CTRADER_SYMBOLS')).length ? parseList(optional('CTRADER_SYMBOLS')) : DEFAULT_SYMBOLS,
  ticksDir: path.resolve(optional('CTRADER_TICKS_DIR', './ticks')!),
  pingIntervalMs: Number(optional('CTRADER_PING_INTERVAL_MS', '20000')),
  reconnectDelayMs: Number(optional('CTRADER_RECONNECT_DELAY_MS', '4000')),
}
