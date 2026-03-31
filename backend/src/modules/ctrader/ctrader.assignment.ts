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

const normalizeAccountSize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .replace(/k$/, '000')

export const assignReadyAccountFromPool = async ({
  userId,
  challengeType,
  phase,
  accountSize,
  baseChallengeId,
  currency,
}: {
  userId: number
  challengeType: string
  phase: string
  accountSize: string
  baseChallengeId?: string
  currency?: string
}) => {
  const normalizedAccountSize = normalizeAccountSize(accountSize)
  const objectiveFields = await buildObjectiveFields({
    accountSize,
    challengeType,
    phase,
  })

  return prisma.$transaction(async (tx) => {
    const readyAccounts = await tx.$queryRaw<{ id: number }[]>`
      SELECT id
      FROM "CTraderAccount"
      WHERE lower(status) = 'ready'
        AND "userId" IS NULL
        AND lower("currency") = lower(${currency ?? 'USD'})
        AND regexp_replace(lower("accountSize"), '[^0-9]', '', 'g') = ${normalizedAccountSize.replace(/\D/g, '')}
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
      currency: currency ?? 'USD',
      ...objectiveFields,
      status: 'assigned_pending_access',
      accessStatus: 'pending',
      assignedAt: new Date(),
    } as Prisma.CTraderAccountUncheckedUpdateInput

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