import http from 'http'
import { URL } from 'url'
import fs from 'fs'
import path from 'path'
import { config } from './config'
import { startCTraderStream, CTraderResolvedAccount, CTraderAccountState, CTraderExecutionEvent } from './ctraderClient'
import { buildMetricsPayload, publishMetrics, fetchActiveAccounts, ActiveAccountSnapshot } from './metricsPublisher'
import { PositionPayload, TradePayload } from './types'
import { createTokenManager } from './tokenManager'

const CALLBACK_PORT = 6000
const ENGINE_PORT = config.enginePort
const ACTIVE_ACCOUNTS_FILE = path.resolve(__dirname, '../data/active-accounts.json')
const ACCOUNT_REFRESH_INTERVAL_MS = config.accountRefreshSeconds * 1000
const PNL_POLL_INTERVAL_MS = config.ctrader.pnlPollIntervalMs
const PNL_REQUESTS_PER_TICK = config.ctrader.pnlRequestsPerTick
const HIGH_PNL_INTERVAL_MS = 5000
const MEDIUM_PNL_INTERVAL_MS = 30000
const LOW_PNL_INTERVAL_MS = 60000

type ActiveAccount = {
  accountNumber: string
  phase?: string | number
  status?: string
  challengeType?: string
}

const ensureDataDir = () => {
  const dir = path.dirname(ACTIVE_ACCOUNTS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const loadActiveAccounts = (): Map<string, ActiveAccount> => {
  try {
    if (!fs.existsSync(ACTIVE_ACCOUNTS_FILE)) {
      return new Map()
    }
    const raw = fs.readFileSync(ACTIVE_ACCOUNTS_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as ActiveAccount[]
    return new Map(parsed.map((item) => [String(item.accountNumber), item]))
  } catch (error) {
    console.error('[active-sync] Failed to load active accounts file', error)
    return new Map()
  }
}

const persistActiveAccounts = (map: Map<string, ActiveAccount>) => {
  try {
    ensureDataDir()
    const values = Array.from(map.values())
    fs.writeFileSync(ACTIVE_ACCOUNTS_FILE, JSON.stringify(values, null, 2))
  } catch (error) {
    console.error('[active-sync] Failed to persist active accounts', error)
  }
}

const startCallbackServer = () => {
  const server = http.createServer((req, res) => {
    const requestUrl = req.url ? new URL(req.url, `http://${req.headers.host}`) : null

    if (requestUrl?.pathname === '/callback') {
      requestUrl.searchParams.get('code')
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Auth successful. You can close this tab.')
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  })

  server.listen(CALLBACK_PORT)
}

const parseBody = async (req: http.IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk))
  }
  if (!chunks.length) return {}
  const raw = Buffer.concat(chunks).toString('utf-8')
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}


const run = async () => {
  startCallbackServer()

  const tokenManager = createTokenManager()
  const explicitTokens = config.ctrader.accessTokens
  const usingExplicitTokens = explicitTokens.length > 0
  const initialTokens = usingExplicitTokens ? null : tokenManager.initialize()
  if (!usingExplicitTokens && !initialTokens?.accessToken) {
    console.error('[ctrader-token] Missing access token; set CTRADER_ACCESS_TOKENS or CTRADER_ACCESS_TOKEN/CTRADER_REFRESH_TOKEN')
    return
  }

  const activeAccounts = loadActiveAccounts()
  console.log('[active-sync] Loaded active accounts', Array.from(activeAccounts.keys()))
  const resolvedMap = new Map<string, CTraderResolvedAccount>()
  const streamByAccount = new Map<string, Awaited<ReturnType<typeof startCTraderStream>>>()
  const accountRuntimeState = new Map<string, CTraderAccountState>()
  const lastMetricsPublishedAt = new Map<string, number>()
  const metricsPublishInFlight = new Set<string>()
  const lastSnapshotRequestAt = new Map<string, number>()
  const lastBalanceUpdatedAt = new Map<string, number>()
  const lastBalanceByAccount = new Map<string, number>()
  const lastPositionsClosedAt = new Map<string, number>()
  const lastPnlRequestAt = new Map<string, number>()
  const pendingBalanceRefreshes = new Map<string, NodeJS.Timeout[]>()
  const pendingClosedTrades = new Map<string, TradePayload[]>()
  const closedTradeKeys = new Map<string, Set<string>>()

  const isActive = (accountNumber: string) => activeAccounts.has(String(accountNumber))
  const ensureAccountState = (accountNumber: string) => {
    const existing = accountRuntimeState.get(accountNumber)
    if (existing) return existing
    const state: CTraderAccountState = {
      balance: 0,
      equity: 0,
      unrealizedPnl: 0,
      balanceRaw: undefined,
      moneyDigits: undefined,
      lastPnlRaw: undefined,
      lastPnlAt: undefined,
      lastPnlPositions: undefined,
      positions: new Map(),
      symbolPrices: new Map(),
      symbolToPositions: new Map(),
      positionPnls: new Map(),
    }
    accountRuntimeState.set(accountNumber, state)
    return state
  }

  const cancelPendingBalanceRefreshes = (accountNumber: string) => {
    const pending = pendingBalanceRefreshes.get(accountNumber)
    if (!pending?.length) return
    pending.forEach((timer) => clearTimeout(timer))
    pendingBalanceRefreshes.delete(accountNumber)
  }

  const getStreamForAccount = (accountNumber: string) => streamByAccount.get(accountNumber)

  const scheduleBalanceRefresh = (accountNumber: string, options?: { attempts?: number; delayMs?: number; jitterMs?: number; reason?: string }) => {
    const attempts = options?.attempts ?? 3
    const delayMs = options?.delayMs ?? 500
    const jitterMs = options?.jitterMs ?? 200
    const reason = options?.reason
    const now = Date.now()
    const lastSnapshotAt = lastSnapshotRequestAt.get(accountNumber) ?? 0
    if (now - lastSnapshotAt < 150) {
      return
    }
    lastSnapshotRequestAt.set(accountNumber, now)
    cancelPendingBalanceRefreshes(accountNumber)
    const timers: NodeJS.Timeout[] = []
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const jitter = Math.floor(Math.random() * jitterMs)
      const delay = delayMs + attempt * delayMs + jitter
      const timer = setTimeout(() => {
        const lastSnapshot = lastSnapshotRequestAt.get(accountNumber) ?? 0
        const snapshotNow = Date.now()
        if (snapshotNow - lastSnapshot < 300) {
          return
        }
        lastSnapshotRequestAt.set(accountNumber, snapshotNow)
        const targetStream = getStreamForAccount(accountNumber)
        targetStream?.requestTraderSnapshot?.(accountNumber)
      }, delay)
      timers.push(timer)
    }
    pendingBalanceRefreshes.set(accountNumber, timers)
  }

  const createStreamHandlers = (connectionId?: string) => {
    let streamRef: Awaited<ReturnType<typeof startCTraderStream>> | null = null

    const handlers = {
      onState: (state: { status?: string; error?: unknown }) => {
        if (state.status === 'error') {
          console.error('[metrics] WebSocket error', state.error)
        }
      },
      onResolvedAccounts: (resolved: Map<string, CTraderResolvedAccount>) => {
        console.log('[ctrader] Accounts fetched', resolved.size, connectionId ? { connectionId } : undefined)
        resolved.forEach((value, key) => {
          resolvedMap.set(key, value)
          if (streamRef) {
            streamByAccount.set(key, streamRef)
          }
        })
        activeAccounts.forEach((account) => {
          if (!resolvedMap.has(account.accountNumber)) {
            return
          }
        })
        activeAccounts.forEach((account) => {
          startMonitoring(account.accountNumber)
        })
      },
      onAccountAuth: (accountNumber: string, resolved: CTraderResolvedAccount) => {
        if (!isActive(accountNumber)) {
          return
        }
      },
      onAccountDisconnect: (accountNumber: string) => {
        if (!isActive(accountNumber)) {
          return
        }
      },
      onBalanceUpdate: (accountNumber: string, balance: number) => {
        if (!isActive(accountNumber)) {
          return
        }
        const state = ensureAccountState(accountNumber)
        state.balance = balance
        lastBalanceUpdatedAt.set(accountNumber, Date.now())
        lastBalanceByAccount.set(accountNumber, balance)
      },
      onExecution: (accountNumber: string, executionEvent: CTraderExecutionEvent) => {
        if (!isActive(accountNumber)) {
          return
        }
        const hasDeal = Boolean(executionEvent.deal)
        const hasDepositWithdraw = Boolean(executionEvent.depositWithdraw)
        if (!hasDeal && !hasDepositWithdraw) {
          return
        }
        if (executionEvent.deal) {
          const deal = executionEvent.deal as any
          const positionId = deal?.positionId != null ? String(deal.positionId) : undefined
          const isClose = Boolean(deal?.closePositionDetail)
          const closeTimeMs = deal?.executionTimestamp != null ? Number(deal.executionTimestamp) : undefined
          const runtimeState = accountRuntimeState.get(accountNumber) ?? ensureAccountState(accountNumber)
          const openTimeMs = positionId ? runtimeState.positions.get(positionId)?.openTime : undefined
          if (isClose && positionId && closeTimeMs != null && openTimeMs != null) {
            const key = deal?.dealId != null ? String(deal.dealId) : `${positionId}:${closeTimeMs}`
            const seen = closedTradeKeys.get(accountNumber) ?? new Set<string>()
            if (!seen.has(key)) {
              seen.add(key)
              closedTradeKeys.set(accountNumber, seen)
              const dealType = deal?.dealType != null ? String(deal.dealType) : undefined
              const trades = pendingClosedTrades.get(accountNumber) ?? []
              trades.push({
                ticket: deal?.dealId != null ? String(deal.dealId) : undefined,
                position_id: positionId,
                open_time: new Date(openTimeMs).toISOString(),
                close_time: new Date(closeTimeMs).toISOString(),
                profit: deal?.grossProfit != null ? Number(deal.grossProfit) : deal?.profit != null ? Number(deal.profit) : undefined,
                dealType,
              })
              pendingClosedTrades.set(accountNumber, trades)
            }
          }
        }
        if (executionEvent.depositWithdraw) {
          const deposit = executionEvent.depositWithdraw as any
          const operationTypeRaw = deposit?.operationType ?? deposit?.dealType
          const operationType = operationTypeRaw != null ? String(operationTypeRaw) : 'BALANCE'
          const dealType = operationType.toUpperCase().includes('WITHDRAW')
            ? 'WITHDRAW'
            : operationType.toUpperCase().includes('DEPOSIT')
              ? 'DEPOSIT'
              : 'BALANCE'
          const tradeKey = deposit?.dealId != null
            ? String(deposit.dealId)
            : `${accountNumber}:${Date.now()}`
          const trades = pendingClosedTrades.get(accountNumber) ?? []
          trades.push({
            ticket: tradeKey,
            open_time: new Date().toISOString(),
            close_time: new Date().toISOString(),
            profit: deposit?.amount != null ? Number(deposit.amount) : deposit?.delta != null ? Number(deposit.delta) : undefined,
            dealType,
          })
          pendingClosedTrades.set(accountNumber, trades)
        }
        scheduleBalanceRefresh(accountNumber, { attempts: 2, delayMs: 250, jitterMs: 100, reason: 'execution' })
      },
      onPositionsUpdate: async (accountNumber: string, state: CTraderAccountState) => {
        if (!isActive(accountNumber)) {
          return
        }
        const now = Date.now()
        const currentOpenCount = Array.from(state.positions.values()).filter((position) => position.isOpen).length
        const previousOpenCount = accountRuntimeState.get(accountNumber)
          ? Array.from((accountRuntimeState.get(accountNumber) as CTraderAccountState).positions.values()).filter((position) => position.isOpen).length
          : currentOpenCount
        if (currentOpenCount < previousOpenCount) {
          lastPositionsClosedAt.set(accountNumber, now)
          lastBalanceByAccount.set(accountNumber, state.balance)
          scheduleBalanceRefresh(accountNumber, { reason: 'position-drop' })
        }
        if (currentOpenCount === 0) {
          const closedAt = lastPositionsClosedAt.get(accountNumber)
          const balanceUpdatedAt = lastBalanceUpdatedAt.get(accountNumber) ?? 0
          if (closedAt) {
            const balanceAtClose = lastBalanceByAccount.get(accountNumber)
            const balanceChanged = balanceAtClose == null || state.balance !== balanceAtClose
            if ((!balanceChanged || balanceUpdatedAt < closedAt) && now - closedAt < 15000) {
              scheduleBalanceRefresh(accountNumber, { attempts: 4, delayMs: 650, jitterMs: 250, reason: 'position-zero' })
            }
          }
          state.positionPnls.clear()
          state.lastPnlPositions = 0
          state.lastPnlRaw = 0
          state.lastPnlAt = now
          state.equity = state.balance
          state.unrealizedPnl = 0
        }
        const pnlPositions = state.lastPnlPositions
        if (pnlPositions == null || (pnlPositions > 0 && (state.lastPnlAt == null || state.lastPnlRaw == null || state.balanceRaw == null))) {
          accountRuntimeState.set(accountNumber, state)
          return
        }
        accountRuntimeState.set(accountNumber, state)
        const positions: PositionPayload[] = Array.from(state.positions.values()).map((position) => ({
          position_id: position.positionId,
          symbol_id: position.symbolId,
          volume: position.volume,
          entry_price: position.entryPrice,
          open_time: position.openTime ? new Date(position.openTime).toISOString() : undefined,
          close_time: position.closeTime ? new Date(position.closeTime).toISOString() : undefined,
          trade_side: position.tradeSide,
          is_open: position.isOpen,
        }))
        const tradesToPublish = pendingClosedTrades.get(accountNumber) ?? []
        const hasPendingTrades = tradesToPublish.length > 0
        const lastPublishedAt = lastMetricsPublishedAt.get(accountNumber) ?? 0
        if (metricsPublishInFlight.has(accountNumber)) {
          return
        }
        if (!hasPendingTrades && now - lastPublishedAt < config.metricsPublishIntervalMs) {
          return
        }
        if (!Number.isFinite(state.balance) || !Number.isFinite(state.equity)) {
          return
        }
        if (state.balance <= 0 || state.equity <= 0) {
          return
        }
        const payload = buildMetricsPayload({
          accountNumber,
          balance: state.balance,
          equity: state.equity,
          trades: hasPendingTrades ? tradesToPublish : undefined,
          positions,
          timestamp: new Date().toISOString(),
        })
        try {
          metricsPublishInFlight.add(accountNumber)
          lastMetricsPublishedAt.set(accountNumber, now)
          await publishMetrics(payload)
          if (hasPendingTrades) {
            pendingClosedTrades.set(accountNumber, [])
          }
        } catch (error) {
          console.error(`[metrics] Failed to publish metrics for ${accountNumber}`, error)
        } finally {
          metricsPublishInFlight.delete(accountNumber)
        }
      },
      onSpotUpdate: (accountNumber: string) => {
        if (!isActive(accountNumber)) {
          return
        }
        const state = ensureAccountState(accountNumber)
        accountRuntimeState.set(accountNumber, state)
      },
    }

    return {
      handlers,
      setStream: (stream: Awaited<ReturnType<typeof startCTraderStream>>) => {
        streamRef = stream
      },
    }
  }

  const streams: Awaited<ReturnType<typeof startCTraderStream>>[] = []
  if (usingExplicitTokens) {
    for (const token of explicitTokens) {
      const connectionId = token.slice(0, 10)
      console.log('[ctrader] Connected token', connectionId)
      const { handlers, setStream } = createStreamHandlers(connectionId)
      const stream = await startCTraderStream(handlers, {
        shouldAuthorizeAccount: (accountNumber) => activeAccounts.has(accountNumber),
        getAccessToken: () => token,
        connectionId,
      })
      setStream(stream)
      streams.push(stream)
    }
  } else if (initialTokens?.accessToken) {
    const { handlers, setStream } = createStreamHandlers()
    const stream = await startCTraderStream(handlers, {
      shouldAuthorizeAccount: (accountNumber) => activeAccounts.has(accountNumber),
      getAccessToken: () => tokenManager.getTokens()?.accessToken,
      onAccessTokenUpdate: (tokens) => {
        console.log('[ctrader-token] Access token updated', { obtainedAt: new Date(tokens.obtainedAt).toISOString() })
      },
    })
    setStream(stream)
    streams.push(stream)
    tokenManager.scheduleRefresh((tokens) => {
      console.log('[ctrader-token] Refreshed access token')
      stream.updateAccessToken(tokens)
    })
  }

  const resolveRiskLevel = (state?: CTraderAccountState) => {
    if (!state) return 'LOW' as const
    const hasOpenPositions = Array.from(state.positions.values()).some((position) => position.isOpen)
    if (!hasOpenPositions) return 'LOW' as const
    if (state.unrealizedPnl < 0) return 'HIGH' as const
    return 'MEDIUM' as const
  }

  const sortByLastRequest = (accounts: string[]) =>
    accounts.sort((a, b) => (lastPnlRequestAt.get(a) ?? 0) - (lastPnlRequestAt.get(b) ?? 0))

  const shouldRequestPnl = (accountNumber: string, intervalMs: number, now: number) => {
    const last = lastPnlRequestAt.get(accountNumber)
    return last == null || now - last >= intervalMs
  }

  const pollUnrealizedPnl = () => {
    const now = Date.now()
    const activeList = Array.from(activeAccounts.keys())
    const high: string[] = []
    const medium: string[] = []
    const low: string[] = []

    activeList.forEach((accountNumber) => {
      const resolved = resolvedMap.get(accountNumber)
      if (!resolved?.authOk) return
      const state = accountRuntimeState.get(accountNumber)
      const risk = resolveRiskLevel(state)
      if (risk === 'HIGH') high.push(accountNumber)
      else if (risk === 'MEDIUM') medium.push(accountNumber)
      else low.push(accountNumber)
    })

    const ordered = [
      { accounts: sortByLastRequest(high), interval: HIGH_PNL_INTERVAL_MS },
      { accounts: sortByLastRequest(medium), interval: MEDIUM_PNL_INTERVAL_MS },
      { accounts: sortByLastRequest(low), interval: LOW_PNL_INTERVAL_MS },
    ]

    let remaining = PNL_REQUESTS_PER_TICK
    ordered.forEach(({ accounts, interval }) => {
      if (remaining <= 0) return
      accounts.forEach((accountNumber) => {
        if (remaining <= 0) return
        if (!shouldRequestPnl(accountNumber, interval, now)) return
        const targetStream = getStreamForAccount(accountNumber)
        const result = targetStream?.requestUnrealizedPnl(accountNumber)
        if (result?.status === 'requested') {
          lastPnlRequestAt.set(accountNumber, now)
          remaining -= 1
        }
      })
    })
  }

  const startMonitoring = (accountNumber: string) => {
    if (!isActive(accountNumber)) {
      return
    }
    const resolved = resolvedMap.get(accountNumber)
    if (!resolved) {
      console.log('[active-sync] Account not resolved yet', accountNumber)
      return
    }
    console.log('[active-sync] Starting monitoring', accountNumber, resolved.ctidTraderAccountId)
    const targetStream = getStreamForAccount(accountNumber)
    if (!targetStream) {
      console.log('[active-sync] Stream not ready for account', accountNumber)
      return
    }
    const result = targetStream.startMonitoring(accountNumber)
    if (result.status === 'already-auth') {
      return
    }
    if (result.status === 'auth-queued') {
      return
    }
  }

  const refreshAccounts = async () => {
    streams.forEach((entry) => entry.resolveAccountsByAccessToken())
    try {
      const remoteAccounts = await fetchActiveAccounts()
      if (!remoteAccounts.length) {
        return
      }
      const nextMap = new Map<string, ActiveAccount>()
      remoteAccounts.forEach((account) => {
        if (!account?.accountNumber) return
        nextMap.set(String(account.accountNumber), {
          accountNumber: String(account.accountNumber),
          phase: account.phase,
          status: account.status,
          challengeType: account.challengeType,
        })
      })
      const toAdd = Array.from(nextMap.keys()).filter((key) => !activeAccounts.has(key))
      const toRemove = Array.from(activeAccounts.keys()).filter((key) => !nextMap.has(key))
      activeAccounts.clear()
      nextMap.forEach((value, key) => activeAccounts.set(key, value))
      persistActiveAccounts(activeAccounts)
      toAdd.forEach((accountNumber) => startMonitoring(accountNumber))
      toRemove.forEach((accountNumber) => {
        accountRuntimeState.delete(accountNumber)
      })
    } catch (error) {
      console.error('[active-sync] Failed to refresh active accounts', error)
    }
  }

  const refreshTimer = setInterval(refreshAccounts, ACCOUNT_REFRESH_INTERVAL_MS)
  const pnlTimer = setInterval(pollUnrealizedPnl, PNL_POLL_INTERVAL_MS)
  void refreshAccounts()

  const activeServer = http.createServer(async (req, res) => {
    const requestUrl = req.url ? new URL(req.url, `http://${req.headers.host}`) : null
    if (!requestUrl) {
      res.writeHead(404)
      res.end()
      return
    }

    const secret = String(req.headers['x-engine-secret'] ?? '')
    if (!secret || secret !== config.backendEngineSecret) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }

    if (req.method === 'POST' && requestUrl.pathname === '/internal/active-accounts/sync') {
      const body = await parseBody(req)
      const accounts = Array.isArray(body?.accounts) ? body.accounts : []
      const nextMap = new Map<string, ActiveAccount>()
      accounts.forEach((account: ActiveAccountSnapshot) => {
        if (!account?.accountNumber) return
        nextMap.set(String(account.accountNumber), {
          accountNumber: String(account.accountNumber),
          phase: account.phase,
          status: account.status,
          challengeType: account.challengeType,
        })
      })
      const toAdd = Array.from(nextMap.keys()).filter((key) => !activeAccounts.has(key))
      const toRemove = Array.from(activeAccounts.keys()).filter((key) => !nextMap.has(key))
      activeAccounts.clear()
      nextMap.forEach((value, key) => activeAccounts.set(key, value))
      persistActiveAccounts(activeAccounts)
      toAdd.forEach((accountNumber) => startMonitoring(accountNumber))
      toRemove.forEach((accountNumber) => {
        accountRuntimeState.delete(accountNumber)
      })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, added: toAdd.length, removed: toRemove.length }))
      return
    }

    if (req.method === 'POST' && requestUrl.pathname === '/internal/active-accounts/add') {
      const body = await parseBody(req)
      const account = body?.account as ActiveAccountSnapshot | undefined
      if (!account?.accountNumber) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'account is required' }))
        return
      }
      const accountNumber = String(account.accountNumber)
      activeAccounts.set(accountNumber, {
        accountNumber,
        phase: account.phase,
        status: account.status,
        challengeType: account.challengeType,
      })
      persistActiveAccounts(activeAccounts)
      startMonitoring(accountNumber)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }

    if (req.method === 'POST' && requestUrl.pathname === '/internal/active-accounts/remove') {
      const body = await parseBody(req)
      const accountNumber = String(body?.accountNumber ?? '')
      if (!accountNumber) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'accountNumber is required' }))
        return
      }
      const reason = body?.reason ? String(body.reason) : undefined
      if (activeAccounts.delete(accountNumber)) {
        persistActiveAccounts(activeAccounts)
        accountRuntimeState.delete(accountNumber)
        void reason
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  })

  activeServer.listen(ENGINE_PORT)

  process.on('SIGINT', () => {
    clearInterval(refreshTimer)
    clearInterval(pnlTimer)
    process.exit(0)
  })
}

run().catch((error) => {
  console.error('[metrics] Fatal error', error)
  process.exit(1)
})