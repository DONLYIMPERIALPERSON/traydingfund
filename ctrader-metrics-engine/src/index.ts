import { config } from './config'
import { startCTraderStream } from './ctraderClient'
import { buildMetricsPayload, publishMetrics } from './metricsPublisher'

const run = async () => {
  if (!config.ctrader.accountIds.length) {
    throw new Error('CTRADER_ACCOUNT_IDS is empty. Provide at least one account id.')
  }

  console.log(`[metrics] Starting cTrader metrics engine for ${config.ctrader.accountIds.length} accounts`)

  const accountState = new Map<string, { snapshot?: { accountNumber: string; balance: number; equity: number }; deals: any[] }>()

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
      const payload = buildMetricsPayload({
        accountNumber: state.snapshot.accountNumber,
        balance: state.snapshot.balance,
        equity: state.snapshot.equity,
        deals: state.deals,
      })

      await publishMetrics(payload)
      console.log(`[metrics] Sent metrics for ${state.snapshot.accountNumber}`)
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
}

run().catch((error) => {
  console.error('[metrics] Fatal error', error)
  process.exit(1)
})