import dotenv from 'dotenv'

dotenv.config()

const must = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required env var: ${key}`)
  }
  return value
}

const optional = (key: string, fallback?: string) => process.env[key] ?? fallback

const parseList = (value?: string) =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    ?? []

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  backendBaseUrl: must('BACKEND_BASE_URL'),
  backendMetricsPath: optional('BACKEND_METRICS_PATH', '/ctrader/metrics'),
  backendActiveAccountsPath: optional('BACKEND_ACTIVE_ACCOUNTS_PATH', '/api/v1/ctrader/active-accounts'),
  backendEngineSecret: must('BACKEND_ENGINE_SECRET'),
  ctrader: {
    wsUrl: optional('CTRADER_WS_URL', 'wss://demo.ctraderapi.com:5035'),
    clientId: must('CTRADER_CLIENT_ID'),
    clientSecret: must('CTRADER_CLIENT_SECRET'),
    accessToken: optional('CTRADER_ACCESS_TOKEN'),
    accountIds: parseList(optional('CTRADER_ACCOUNT_IDS')),
  },
  pollIntervalSeconds: Number(optional('POLL_INTERVAL_SECONDS', '30')),
  activeAccountsPollSeconds: Number(optional('ACTIVE_ACCOUNTS_POLL_SECONDS', '10')),
}