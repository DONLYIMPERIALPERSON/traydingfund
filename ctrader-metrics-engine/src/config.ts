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

const parseNumberMap = (value?: string) => {
  if (!value) return {}
  return value.split(',').reduce((acc, entry) => {
    const [key, rawValue] = entry.split(':').map((item) => item.trim())
    if (!key || !rawValue) return acc
    const numericValue = Number(rawValue)
    if (Number.isFinite(numericValue) && numericValue > 0) {
      acc[key] = numericValue
    }
    return acc
  }, {} as Record<string, number>)
}

const parseBoolean = (value: string | undefined, fallback = false) => {
  if (value == null) return fallback
  return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase())
}

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  backendBaseUrl: must('BACKEND_BASE_URL'),
  backendMetricsPath: optional('BACKEND_METRICS_PATH', '/api/v1/ctrader/metrics'),
  backendActiveAccountsPath: optional('BACKEND_ACTIVE_ACCOUNTS_PATH', '/api/v1/ctrader/active-accounts'),
  backendEngineSecret: must('BACKEND_ENGINE_SECRET'),
  metricsPublishIntervalMs: Number(optional('METRICS_PUBLISH_INTERVAL_MS', '1000')),
  enginePort: Number(optional('ENGINE_PORT', '7005')),
  accountRefreshSeconds: Number(optional('ACCOUNT_REFRESH_SECONDS', '60')),
  ctrader: {
    wsUrl: optional('CTRADER_WS_URL', 'wss://demo.ctraderapi.com:5035'),
    clientId: must('CTRADER_CLIENT_ID'),
    clientSecret: must('CTRADER_CLIENT_SECRET'),
    accessTokens: parseList(optional('CTRADER_ACCESS_TOKENS')),
    accessToken: optional('CTRADER_ACCESS_TOKEN'),
    refreshToken: optional('CTRADER_REFRESH_TOKEN'),
    tokenEndpoint: optional('CTRADER_TOKEN_ENDPOINT', 'https://openapi.ctrader.com/apps/token'),
    tokenRefreshLeewaySeconds: Number(optional('CTRADER_TOKEN_REFRESH_LEEWAY_SECONDS', '300')),
    tokenRefreshFallbackSeconds: Number(optional('CTRADER_TOKEN_REFRESH_FALLBACK_SECONDS', '3300')),
    accountIds: parseList(optional('CTRADER_ACCOUNT_IDS')),
    pnlMultipliers: parseNumberMap(optional('CTRADER_PNL_MULTIPLIERS')),
    lotSizeDivisors: parseNumberMap(optional('CTRADER_LOTSIZE_DIVISORS')),
    pnlPollIntervalMs: Number(optional('CTRADER_PNL_POLL_INTERVAL_MS', '1000')),
    pnlRequestsPerTick: Number(optional('CTRADER_PNL_REQUESTS_PER_TICK', '40')),
  },
}