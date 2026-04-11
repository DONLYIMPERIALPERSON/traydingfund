import { createApp } from './app'
import { env } from './config/env'
import { prisma } from './config/prisma'
import { pushActiveAccountFullSync } from './services/ctraderEngine.service'

const ACTIVE_STATUSES = ['active', 'assigned', 'assigned_pending_access', 'funded', 'withdraw_requested']

const syncActiveAccounts = async () => {
  if (!env.ctraderEngineWebhookUrl) {
    return
  }
  try {
    const accounts = await prisma.cTraderAccount.findMany({
      where: { status: { in: ACTIVE_STATUSES, mode: 'insensitive' } },
      include: { metrics: { select: { balance: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    const payload = accounts.map((account) => ({
      accountNumber: account.accountNumber,
      balance: account.metrics?.balance ?? account.initialBalance ?? 0,
      status: account.status,
      phase: account.phase,
      challengeType: account.challengeType,
    }))
    await pushActiveAccountFullSync(payload)
  } catch (error) {
    console.error('[engine-sync] Failed to sync active accounts', error)
  }
}

const app = createApp()

const start = async () => {
  try {
    await prisma.$connect()
    app.listen(env.port, () => {
      console.log(`API running on http://localhost:${env.port}`)
    })
    if (env.ctraderEngineSyncEnabled && env.ctraderEngineWebhookUrl && env.ctraderEngineWebhookUrl !== 'disabled') {
      const intervalMs = Math.max(env.ctraderEngineSyncIntervalSeconds, 10) * 1000
      syncActiveAccounts()
      setInterval(syncActiveAccounts, intervalMs)
      console.log(`[engine-sync] Active account sync scheduled every ${intervalMs / 1000}s`)
    }
  } catch (error) {
    console.error('Failed to connect to database', error)
    process.exit(1)
  }
}

const shutdown = async (signal: string) => {
  try {
    console.log(`Received ${signal}. Shutting down...`)
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error during shutdown', error)
  } finally {
    process.exit(0)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

start()