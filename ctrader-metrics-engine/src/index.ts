import http from 'http'
import { URL } from 'url'
import { config } from './config'
import { startCTraderStream } from './ctraderClient'
import { buildMetricsPayload, publishMetrics, fetchActiveAccounts, ActiveAccountSnapshot } from './metricsPublisher'

const CALLBACK_PORT = 6000

const startCallbackServer = () => {
  const server = http.createServer((req, res) => {
    const requestUrl = req.url ? new URL(req.url, `http://${req.headers.host}`) : null

    if (requestUrl?.pathname === '/callback') {
      const code = requestUrl.searchParams.get('code')
      console.log('AUTH CODE:', code)
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Auth successful. You can close this tab.')
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  })

  server.listen(CALLBACK_PORT, () => {
    console.log(`[metrics] Callback server listening on http://localhost:${CALLBACK_PORT}/callback`)
  })
}

const run = async () => {
  startCallbackServer()

  if (!config.ctrader.accessToken) {
    console.warn('[metrics] CTRADER_ACCESS_TOKEN is not set. Skipping cTrader stream startup.')
    return
  }

  console.log(`[metrics] Starting cTrader metrics engine for ${config.ctrader.accountIds.length} accounts`)

  const accountState = new Map<string, { snapshot?: { accountNumber: string; balance: number; equity: number }; deals: any[] }>()
  const activeAccounts = new Map<string, ActiveAccountSnapshot>()

  const syncActiveAccounts = async () => {
    try {
      const accounts = await fetchActiveAccounts()
      activeAccounts.clear()
      accounts.forEach((account) => {
        activeAccounts.set(String(account.accountNumber), account)
      })
      console.log(`[metrics] Synced ${activeAccounts.size} active accounts`)
    } catch (error) {
      console.error('[metrics] Failed to sync active accounts', error)
    }
  }

  await syncActiveAccounts()
  const activeAccountsTimer = setInterval(syncActiveAccounts, config.activeAccountsPollSeconds * 1000)

  await startCTraderStream(async (event) => {
    const state = accountState.get(event.accountId) ?? { deals: [] }
    if (event.snapshot) {
      state.snapshot = {
        accountNumber: event.snapshot.accountNumber,
        balance: event.snapshot.balance,
        equity: event.snapshot.equity,
      }
    }
    if (event.deals?.length) {
      state.deals = [...event.deals, ...state.deals].slice(0, 50)
    }
    accountState.set(event.accountId, state)

    if (state.snapshot) {
      if (!activeAccounts.has(state.snapshot.accountNumber)) {
        return
      }
      const payload = buildMetricsPayload({
        accountNumber: state.snapshot.accountNumber,
        balance: state.snapshot.balance,
        equity: state.snapshot.equity,
        deals: state.deals,
      })

      try {
        await publishMetrics(payload)
        console.log(`[metrics] Sent metrics for ${state.snapshot.accountNumber}`)
      } catch (error) {
        console.error(`[metrics] Failed to publish metrics for ${state.snapshot.accountNumber}`, error)
      }
    }
  }, (state) => {
    if (state.status === 'connected') {
      console.log('[metrics] Connected to cTrader Open API')
      return
    }

    if (state.status === 'error') {
      console.error('[metrics] WebSocket error', state.error)
      return
    }

    console.warn('[metrics] WebSocket closed')
  })

  process.on('SIGINT', () => {
    clearInterval(activeAccountsTimer)
    process.exit(0)
  })
}

run().catch((error) => {
  console.error('[metrics] Fatal error', error)
  process.exit(1)
})