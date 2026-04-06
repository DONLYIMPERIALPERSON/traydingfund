import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { buildObjectiveFields } from './ctrader.objectives'
import { pushActiveAccountAdd } from '../../services/ctraderEngine.service'

export const normalizeChallengeBase = (challengeId: string) =>
  challengeId.replace(/-(ph2|funded)$/i, '')

export const buildBaseChallengeId = (accountId: number) =>
  `CH-${String(accountId).padStart(4, '0')}`

export const buildChallengeIdForPhase = (baseChallengeId: string, phase: string) => {
  const normalized = phase.toLowerCase()
  if (normalized === 'phase_2') return `${baseChallengeId}-ph2`
  if (normalized === 'funded') return `${baseChallengeId}-funded`
  return baseChallengeId
}

export const normalizeAccountSize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .replace(/k$/, '000')

export const resolveChallengeCurrency = (challengeType?: string | null, currency?: string | null) => {
  const trimmed = currency?.trim()
  if (trimmed) {
    return trimmed.toUpperCase()
  }
  const normalized = String(challengeType ?? '').toLowerCase()
  if (normalized.includes('ngn')) {
    return 'NGN'
  }
  return 'USD'
}

export const assignReadyAccountFromPool = async ({
  userId,
  challengeType,
  phase,
  accountSize,
  baseChallengeId,
  currency,
  platform,
}: {
  userId: number
  challengeType: string
  phase: string
  accountSize: string
  baseChallengeId?: string
  currency?: string
  platform?: string
}) => {
  const normalizedAccountSize = normalizeAccountSize(accountSize)
  const resolvedCurrency = resolveChallengeCurrency(challengeType, currency ?? null)
  const resolvedPlatform = String(platform ?? 'ctrader').toLowerCase()
  const objectiveFields = await buildObjectiveFields({
    accountSize,
    challengeType,
    phase,
  })

  return prisma.$transaction(async (tx) => {
    const readyAccounts = await tx.$queryRaw<{ id: number; accountNumber: string; mt5Login: string | null }[]>`
      SELECT id, "accountNumber", "mt5Login"
      FROM "CTraderAccount"
      WHERE lower(status) = 'ready'
        AND "userId" IS NULL
        AND lower("currency") = lower(${resolvedCurrency})
        AND lower("platform") = lower(${resolvedPlatform})
        AND regexp_replace(lower("accountSize"), '[^0-9]', '', 'g') = ${normalizedAccountSize.replace(/\D/g, '')}
        AND (
          lower(${resolvedPlatform}) <> 'mt5'
          OR (
            "mt5Server" IS NOT NULL
            AND "mt5Password" IS NOT NULL
          )
        )
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE
    `

    const account = readyAccounts[0]
    if (!account) {
      return null
    }

    const baseId = baseChallengeId ?? buildBaseChallengeId(account.id)
    const challengeId = buildChallengeIdForPhase(baseId, phase)

    const existingChallenge = await tx.cTraderAccount.findFirst({
      where: { challengeId },
      select: { id: true },
    })
    if (existingChallenge) {
      return null
    }
    const updateData = {
      challengeId,
      userId,
      challengeType,
      phase,
      currency: resolvedCurrency,
      ...objectiveFields,
      status: 'assigned_pending_access',
      accessStatus: 'pending',
      assignedAt: new Date(),
    } as Prisma.CTraderAccountUncheckedUpdateInput

    if (resolvedPlatform === 'mt5') {
      updateData.mt5Login = account.mt5Login ?? account.accountNumber
    }

    const updated = await tx.cTraderAccount.update({
      where: { id: account.id },
      data: updateData,
    })
    try {
      await pushActiveAccountAdd({
        accountNumber: updated.accountNumber,
        phase: updated.phase,
        status: updated.status,
        challengeType: updated.challengeType,
      })
    } catch (error) {
      console.error('Failed to push active account add', error)
    }
    return updated
  })
}