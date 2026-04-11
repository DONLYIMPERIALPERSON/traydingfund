import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { ApiError } from '../../common/errors'

type EngineRegistryEntry = {
  id: string
  host: string | null
  capacity: number
  activeAccounts: Set<string>
  lastSeenAt: number
}

const engineRegistry = new Map<string, EngineRegistryEntry>()

const nowMs = () => Date.now()

const pruneRegistry = () => {
  const ttlMs = Math.max(5, env.mt5DispatcherTtlSeconds || 30) * 1000
  const cutoff = nowMs() - ttlMs
  for (const [engineId, entry] of engineRegistry.entries()) {
    if (entry.lastSeenAt < cutoff) {
      engineRegistry.delete(engineId)
    }
  }
}

const resolveEngine = (engineId: string, host?: string | null, capacity?: number | null) => {
  const existing = engineRegistry.get(engineId)
  if (existing) {
    existing.host = host ?? existing.host
    existing.capacity = capacity != null ? Math.max(1, capacity) : existing.capacity
    existing.lastSeenAt = nowMs()
    return existing
  }

  const entry: EngineRegistryEntry = {
    id: engineId,
    host: host ?? null,
    capacity: Math.max(1, capacity ?? 1),
    activeAccounts: new Set(),
    lastSeenAt: nowMs(),
  }
  engineRegistry.set(engineId, entry)
  return entry
}

const selectEngine = () => {
  pruneRegistry()
  let selected: EngineRegistryEntry | null = null
  let bestScore = -Infinity
  for (const entry of engineRegistry.values()) {
    const available = Math.max(0, entry.capacity - entry.activeAccounts.size)
    if (available <= 0) continue
    const score = -entry.activeAccounts.size
    if (score > bestScore) {
      bestScore = score
      selected = entry
    }
  }
  return selected
}

const ensureDispatcherAuth = (req: Request) => {
  const secret = req.header('X-ENGINE-SECRET')
  if (!secret || secret !== env.mt5DispatcherSecret) {
    throw new ApiError('Unauthorized engine request', 401)
  }
  const engineId = String(req.header('X-ENGINE-ID') ?? '').trim()
  if (!engineId) {
    throw new ApiError('X-ENGINE-ID header is required', 400)
  }
  return engineId
}

export const listAssignedMt5Accounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const engineId = ensureDispatcherAuth(req)
    const host = req.header('X-ENGINE-HOST') ?? null
    const capacityHeader = req.header('X-ENGINE-CAPACITY')
    const capacity = capacityHeader ? Number(capacityHeader) : undefined
    const engine = resolveEngine(engineId, host, capacity)

    const activeAccounts = await prisma.$queryRaw<{
      accountNumber: string
      mt5Login: string | null
      mt5Password: string | null
      mt5Server: string | null
    }[]>`
      SELECT "accountNumber", "mt5Login", "mt5Password", "mt5Server"
      FROM "CTraderAccount"
      WHERE lower("platform") = 'mt5'
        AND lower("status") IN ('active', 'assigned', 'assigned_pending_access', 'funded', 'admin_checking')
        AND "userId" IS NOT NULL
      ORDER BY "updatedAt" ASC
    `

    const assignedAccounts = new Set(engine.activeAccounts)

    for (const account of activeAccounts) {
      if (assignedAccounts.has(account.accountNumber)) continue
      const nextEngine = selectEngine()
      if (!nextEngine) break
      nextEngine.activeAccounts.add(account.accountNumber)
      if (nextEngine.id === engine.id) {
        assignedAccounts.add(account.accountNumber)
      }
    }

    const responsePayload = activeAccounts
      .filter((account) => assignedAccounts.has(account.accountNumber))
      .map((account) => ({
        account_number: account.accountNumber,
        mt5Login: account.mt5Login ?? account.accountNumber,
        mt5Password: account.mt5Password,
        mt5Server: account.mt5Server,
      }))

    engine.activeAccounts = new Set(responsePayload.map((account) => account.account_number))
    engine.lastSeenAt = nowMs()

    console.info('[mt5-dispatcher] heartbeat', {
      engineId: engine.id,
      host: engine.host,
      activeAccounts: engine.activeAccounts.size,
      capacity: engine.capacity,
      lastSeenAt: engine.lastSeenAt,
    })

    res.json(responsePayload)
  } catch (err) {
    next(err as Error)
  }
}