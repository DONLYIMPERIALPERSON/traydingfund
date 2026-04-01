import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { config } from './config'

export type CTraderTokens = {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
  obtainedAt: number
}

type TokenState = {
  current: CTraderTokens | null
}

const TOKEN_CACHE_FILE = path.resolve(__dirname, '../data/ctrader-tokens.json')

const ensureDataDir = () => {
  const dir = path.dirname(TOKEN_CACHE_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const persistTokens = (tokens: CTraderTokens) => {
  try {
    ensureDataDir()
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(tokens, null, 2))
  } catch (error) {
    console.error('[ctrader-token] Failed to persist tokens', error)
  }
}

const loadPersistedTokens = (): CTraderTokens | null => {
  try {
    if (!fs.existsSync(TOKEN_CACHE_FILE)) return null
    const raw = fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8')
    return JSON.parse(raw) as CTraderTokens
  } catch (error) {
    console.error('[ctrader-token] Failed to load persisted tokens', error)
    return null
  }
}

const parseTokenResponse = (payload: any): CTraderTokens => ({
  accessToken: payload.access_token,
  refreshToken: payload.refresh_token,
  expiresIn: payload.expires_in,
  tokenType: payload.token_type,
  obtainedAt: Date.now(),
})

const refreshAccessToken = async (refreshToken: string): Promise<CTraderTokens> => {
  const response = await axios.post(
    config.ctrader.tokenEndpoint || 'https://openapi.ctrader.com/apps/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.ctrader.clientId,
      client_secret: config.ctrader.clientSecret,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    }
  )

  if (!response.data?.access_token) {
    throw new Error('Token refresh response missing access_token')
  }

  return parseTokenResponse(response.data)
}

export const createTokenManager = () => {
  const state: TokenState = {
    current: null,
  }

  const initialize = () => {
    const persisted = loadPersistedTokens()
    if (persisted?.accessToken) {
      state.current = persisted
      return persisted
    }
    if (config.ctrader.accessToken) {
      state.current = {
        accessToken: config.ctrader.accessToken,
        refreshToken: config.ctrader.refreshToken,
        expiresIn: undefined,
        tokenType: 'bearer',
        obtainedAt: Date.now(),
      }
      return state.current
    }
    return null
  }

  const getTokens = () => state.current

  const updateTokens = (tokens: CTraderTokens) => {
    state.current = tokens
    persistTokens(tokens)
  }

  const refreshTokens = async () => {
    const refreshTokenValue = state.current?.refreshToken ?? config.ctrader.refreshToken
    if (!refreshTokenValue) {
      throw new Error('Missing CTRADER_REFRESH_TOKEN for refresh flow')
    }
    const tokens = await refreshAccessToken(refreshTokenValue)
    updateTokens(tokens)
    return tokens
  }

  const scheduleRefresh = (callback: (tokens: CTraderTokens) => void) => {
    let timer: NodeJS.Timeout | undefined
    let failureCount = 0

    const clear = () => {
      if (timer) clearTimeout(timer)
      timer = undefined
    }

    const schedule = () => {
      clear()
      const tokens = state.current
      if (!tokens?.accessToken) return
      const expiresIn = tokens.expiresIn ?? config.ctrader.tokenRefreshFallbackSeconds
      const leeway = config.ctrader.tokenRefreshLeewaySeconds
      const refreshInMs = Math.max(30, expiresIn - leeway) * 1000
      timer = setTimeout(async () => {
        try {
          const refreshed = await refreshTokens()
          callback(refreshed)
          failureCount = 0
          schedule()
        } catch (error) {
          failureCount += 1
          const backoffSeconds = Math.min(600, 60 * Math.pow(2, Math.min(failureCount, 3)))
          console.error(`[ctrader-token] Refresh failed, retrying in ${backoffSeconds}s`, error)
          timer = setTimeout(schedule, backoffSeconds * 1000)
        }
      }, refreshInMs)
    }

    schedule()

    return clear
  }

  return {
    initialize,
    getTokens,
    updateTokens,
    refreshTokens,
    scheduleRefresh,
  }
}