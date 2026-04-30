import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { Prisma } from '@prisma/client'
import { requestAccountAccess } from '../../services/accessEngine.service'
import { pushActiveAccountAdd } from '../../services/ctraderEngine.service'
import { recordCredentialView } from '../../services/emailLog.service'
import { buildObjectiveFields } from '../ctrader/ctrader.objectives'
import { assignReadyAccountFromPool, buildBaseChallengeId, buildChallengeIdForPhase, normalizeAccountSize, normalizeChallengeBase, resolveChallengeCurrency } from '../ctrader/ctrader.assignment'

const BREEZY_SUBSCRIPTION_DAYS = 7
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
const isBreezyChallengeType = (challengeType?: string | null) => String(challengeType ?? '').toLowerCase() === 'breezy'

type UploadAccountPayload = {
  account_number: string
  broker: string
  account_size: string
  status?: string
  currency?: string
  platform?: string
  mt5_login?: string
  mt5_server?: string
  mt5_password?: string
}

type AccountSummary = {
  total: number
  ready: number
  assigned: number
  disabled: number
  ctrader: {
    total: number
    ready: number
    assigned: number
    disabled: number
  }
  mt5: {
    total: number
    ready: number
    assigned: number
    disabled: number
  }
}

type ListCTraderQuery = {
  status?: string
}

type ForceNextStagePayload = {
  account_id?: number
}

type AdminResetPayload = {
  account_id?: number
  account_number?: string
}

type UpdateMt5PasswordPayload = {
  account_id?: number
  account_number?: string
  mt5_password?: string
}

type ReplaceAccountPayload = {
  account_id?: number
  account_number?: string
  platform?: 'mt5' | 'ctrader'
  next_phase?: boolean
  target_phase?: string
}

type ChangeAccountPhasePayload = {
  account_id?: number
  account_number?: string
  target_phase?: string
}

const normalizeUploadAccountSize = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return raw
  let value = Number(digits)
  if (digits.length <= 3) {
    value *= 1000
  }
  if (!Number.isFinite(value) || value <= 0) return raw
  return `$${value.toLocaleString('en-US')}`
}

const resolveReplacementPhase = (challengeType: string, phase: string, nextPhase: boolean) => {
  const normalizedChallengeType = String(challengeType ?? 'two_step').toLowerCase()
  const normalizedPhase = String(phase ?? 'phase_1').toLowerCase()

  if (!nextPhase) return normalizedPhase

  if (normalizedChallengeType === 'instant_funded' || normalizedPhase === 'funded') {
    return null
  }

  if (normalizedChallengeType === 'two_step') {
    return normalizedPhase === 'phase_1' ? 'phase_2' : normalizedPhase === 'phase_2' ? 'funded' : null
  }

  if (['one_step', 'ngn_standard', 'ngn_flexi'].includes(normalizedChallengeType)) {
    return normalizedPhase === 'phase_1' ? 'phase_2' : normalizedPhase === 'phase_2' ? 'funded' : null
  }

  return null
}

const normalizeReplacementPhaseInput = (value?: string | null) => {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/\s+/g, '_')
  if (!normalized) return null
  if (normalized === 'phase1' || normalized === 'phase_1') return 'phase_1'
  if (normalized === 'phase2' || normalized === 'phase_2') return 'phase_2'
  if (normalized === 'funded') return 'funded'
  return null
}

const isAllowedReplacementPhase = (challengeType: string, targetPhase: string) => {
  const normalizedChallengeType = String(challengeType ?? 'two_step').toLowerCase()
  if (normalizedChallengeType === 'instant_funded') return targetPhase === 'funded'
  if (normalizedChallengeType === 'attic') return targetPhase === 'phase_1'
  if (['two_step', 'one_step', 'ngn_standard', 'ngn_flexi'].includes(normalizedChallengeType)) {
    return ['phase_1', 'phase_2', 'funded'].includes(targetPhase)
  }
  return ['phase_1', 'phase_2', 'funded'].includes(targetPhase)
}

export const uploadCTraderAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = (req.body as { accounts?: UploadAccountPayload[] })?.accounts
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      throw new ApiError('accounts array is required', 400)
    }

    const normalized = accounts.map((account) => {
      const accountNumber = String(account.account_number ?? '').trim()
      const platform = String(account.platform ?? 'ctrader').trim().toLowerCase()
      return {
        accountNumber,
        brokerName: String(account.broker ?? '').trim(),
        accountSize: normalizeUploadAccountSize(String(account.account_size ?? '').trim()),
        status: String(account.status ?? 'Ready').trim(),
        currency: String(account.currency ?? 'USD').trim().toUpperCase(),
        platform,
        mt5Login: platform === 'mt5'
          ? (account.mt5_login ? String(account.mt5_login).trim() : accountNumber || null)
          : (account.mt5_login ? String(account.mt5_login).trim() : null),
        mt5Server: account.mt5_server ? String(account.mt5_server).trim() : null,
        mt5Password: account.mt5_password ? String(account.mt5_password).trim() : null,
      }
    })

    normalized.forEach((account, index) => {
      if (!account.accountNumber || !account.brokerName || !account.accountSize) {
        throw new ApiError(`Invalid account payload at index ${index}`, 400)
      }
      if (!['ctrader', 'mt5'].includes(account.platform)) {
        throw new ApiError(`Invalid platform at index ${index}`, 400)
      }
      if (account.platform === 'mt5' && (!account.mt5Server || !account.mt5Password)) {
        throw new ApiError(`MT5 server and password are required at index ${index}`, 400)
      }
    })

    const uniqueByChallenge = new Map(
      normalized.map((account) => [
        `READY-${account.accountNumber}`,
        {
          challengeId: `READY-${account.accountNumber}`,
          accountSize: account.accountSize,
          phase: 'Ready',
          status: account.status,
          currency: account.currency,
          platform: account.platform,
          brokerName: account.brokerName,
          accountNumber: account.accountNumber,
          mt5Login: account.mt5Login,
          mt5Server: account.mt5Server,
          mt5Password: account.mt5Password,
          userId: null as number | null,
        },
      ])
    )

    const uniqueAccounts = Array.from(uniqueByChallenge.values())
    const existing = await prisma.cTraderAccount.findMany({
      where: { challengeId: { in: uniqueAccounts.map((account) => account.challengeId) } },
      select: { challengeId: true },
    })
    const existingIds = new Set(existing.map((item) => item.challengeId))

    const existingAccounts = await prisma.cTraderAccount.findMany({
      where: { accountNumber: { in: uniqueAccounts.map((account) => account.accountNumber) } },
      select: { accountNumber: true, status: true, challengeId: true },
    })
    const existingAccountNumbers = new Set(existingAccounts.map((item) => item.accountNumber))

    const toCreate = uniqueAccounts.filter((account) => (
      !existingIds.has(account.challengeId)
      && !existingAccountNumbers.has(account.accountNumber)
    ))
    if (toCreate.length) {
      await prisma.cTraderAccount.createMany({ data: toCreate, skipDuplicates: true })
    }

    const pendingOrders = await prisma.order.findMany({
      where: { assignmentStatus: 'pending_assign', status: { in: ['pending', 'completed'] } },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    })

    for (const order of pendingOrders) {
      const assigned = await assignReadyAccountFromPool({
        userId: order.userId,
        challengeType: order.challengeType ?? 'two_step',
        phase: order.phase ?? 'phase_1',
        accountSize: order.accountSize,
        currency: order.currency ?? 'USD',
        baseChallengeId: buildBaseChallengeId(order.id),
        platform: (order.metadata as { platform?: string } | null)?.platform ?? 'ctrader',
      })

      if (!assigned) break

      await prisma.order.update({
        where: { id: order.id },
        data: { assignmentStatus: 'assigned' },
      })

      if (isBreezyChallengeType(order.challengeType)) {
        const paidAt = order.paidAt ?? new Date()
        await prisma.cTraderAccount.update({
          where: { id: assigned.id },
          data: {
            subscriptionStartedAt: paidAt,
            subscriptionExpiresAt: addDays(paidAt, BREEZY_SUBSCRIPTION_DAYS),
            subscriptionStatus: 'active',
            renewalPriceKobo: order.netAmountKobo,
          },
        })
      }

      const accessAccountSize = assigned.accountSize ?? order.accountSize
      await requestAccountAccess({
        user_email: order.user.email,
        account_number: assigned.accountNumber,
        broker: assigned.brokerName,
        platform: (order.metadata as { platform?: string } | null)?.platform ?? 'ctrader',
        ...(order.user.fullName ? { user_name: order.user.fullName } : {}),
        ...(order.challengeType ? { account_type: order.challengeType } : {}),
        ...(order.phase ? { account_phase: order.phase } : {}),
        ...(accessAccountSize ? { account_size: accessAccountSize } : {}),
        ...(assigned.mt5Login ? { mt5_login: assigned.mt5Login } : {}),
        ...(assigned.mt5Server ? { mt5_server: assigned.mt5Server } : {}),
        ...(assigned.mt5Password ? { mt5_password: assigned.mt5Password } : {}),
      })
    }

    // Next-stage assignment disabled: accounts are reused and moved forward via finance reset flow.

    res.status(201).json({
      created: toCreate.length,
      skipped: Array.from(existingIds),
      skipped_accounts: Array.from(existingAccountNumbers),
    })
  } catch (err) {
    next(err as Error)
  }
}

export const forceAssignNextStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    throw new ApiError('Next stage assignment is disabled. Use the reset flow to advance phases.', 409)
    const { account_id } = req.body as ForceNextStagePayload
    if (!account_id || !Number.isFinite(Number(account_id))) {
      throw new ApiError('account_id is required', 400)
    }

    const account = await prisma.cTraderAccount.findUnique({
      where: { id: Number(account_id) },
      include: { user: true },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    const resolvedAccount = account as NonNullable<typeof account>
    const accountUserId = resolvedAccount.userId
    if (!accountUserId) {
      throw new ApiError('Account has no assigned user', 400)
    }

    const normalizedChallengeType = String(resolvedAccount.challengeType ?? 'two_step').toLowerCase()
    const normalizedPhase = String(resolvedAccount.phase ?? '').toLowerCase()
    if (normalizedChallengeType === 'instant_funded' || normalizedPhase === 'funded') {
      throw new ApiError('Account is not eligible for next stage', 400)
    }

    const nextPhase = normalizedChallengeType === 'two_step'
      ? (normalizedPhase === 'phase_1' ? 'phase_2' : normalizedPhase === 'phase_2' ? 'funded' : null)
      : ['one_step', 'ngn_standard', 'ngn_flexi'].includes(normalizedChallengeType)
        ? (normalizedPhase === 'phase_1' ? 'phase_2' : normalizedPhase === 'phase_2' ? 'funded' : null)
        : null

    if (!nextPhase) {
      throw new ApiError('Account is not eligible for next stage', 400)
    }

    const resolvedNextPhase = nextPhase

    const assigned = await assignReadyAccountFromPool({
      userId: accountUserId as number,
      challengeType: resolvedAccount.challengeType ?? 'two_step',
      phase: String(resolvedNextPhase ?? ''),
      accountSize: resolvedAccount.accountSize,
      currency: resolveChallengeCurrency(resolvedAccount.challengeType, resolvedAccount.currency ?? null),
      baseChallengeId: normalizeChallengeBase(resolvedAccount.challengeId ?? ''),
    })

    if (!assigned) {
      throw new ApiError('No ready account available to assign next stage', 409)
    }

    const assignedAccount = assigned as NonNullable<typeof assigned>

    await prisma.cTraderAccount.update({
      where: { id: resolvedAccount.id },
      data: { status: 'completed' },
    })

    const resolvedUser = resolvedAccount.user
    const resolvedUserEmail = resolvedUser?.email ?? null
    if (!resolvedUserEmail) {
      res.json({
        message: 'Next stage assigned',
        assigned_challenge_id: assignedAccount.challengeId,
        assigned_account_number: assignedAccount.accountNumber,
      })
      return
    }

    const email = resolvedUserEmail
    const resolvedUserFullName = resolvedUser?.fullName ?? undefined
    const accessAccountSize = assignedAccount.accountSize ?? resolvedAccount.accountSize
    const accessPayload: Parameters<typeof requestAccountAccess>[0] = {
      user_email: email!,
      account_number: assignedAccount.accountNumber,
      broker: assignedAccount.brokerName,
      platform: assignedAccount.platform ?? 'ctrader',
      ...(resolvedUserFullName ? { user_name: resolvedUserFullName } : {}),
      ...(accessAccountSize ? { account_size: accessAccountSize } : {}),
    }
    const accountType = resolvedAccount.challengeType ?? undefined
    if (accountType) {
      accessPayload.account_type = accountType
    }
    const accountPhase = resolvedNextPhase ?? undefined
    if (accountPhase) {
      accessPayload.account_phase = accountPhase
    }
    const mt5Login = assignedAccount.mt5Login
    if (mt5Login !== null) {
      accessPayload.mt5_login = mt5Login as string
    }
    const mt5Server = assignedAccount.mt5Server
    if (mt5Server !== null) {
      accessPayload.mt5_server = mt5Server as string
    }
    const mt5Password = assignedAccount.mt5Password
    if (mt5Password !== null) {
      accessPayload.mt5_password = mt5Password as string
    }
    await requestAccountAccess(accessPayload)

    res.json({
      message: 'Next stage assigned',
      assigned_challenge_id: assignedAccount.challengeId,
      assigned_account_number: assignedAccount.accountNumber,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const deleteReadyCTraderAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = Number(req.params.id)
    if (!Number.isFinite(accountId)) {
      throw new ApiError('Invalid account ID', 400)
    }

    const account = await prisma.cTraderAccount.findUnique({ where: { id: accountId } })
    if (!account) {
      throw new ApiError('Account not found', 404)
    }
    if (account.userId) {
      throw new ApiError('Only ready accounts can be deleted', 400)
    }

    await prisma.cTraderAccount.delete({ where: { id: accountId } })
    res.json({ message: 'Ready account deleted', id: accountId })
  } catch (err) {
    next(err as Error)
  }
}

export const adminResetAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { account_id, account_number } = req.body as AdminResetPayload
    const accountId = account_id != null ? Number(account_id) : null
    const accountNumber = account_number ? String(account_number).trim() : null
    if (!accountId && !accountNumber) {
      throw new ApiError('account_id or account_number is required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: accountId ? { id: accountId } : { accountNumber: accountNumber ?? '' },
      include: { metrics: true },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    await prisma.$transaction([
      prisma.cTraderAccount.update({
        where: { id: account.id },
        data: {
          status: 'admin_checking',
          breachedAt: null,
          passedAt: null,
        },
      }),
      prisma.cTraderAccountMetric.deleteMany({
        where: { accountId: account.id },
      }),
    ])

    try {
      await pushActiveAccountAdd({
        accountNumber: account.accountNumber,
        phase: account.phase,
        status: 'admin_checking',
        challengeType: account.challengeType,
      })
    } catch (error) {
      console.error('Failed to push active account for admin reset', error)
    }

    res.json({
      status: 'pending',
      message: 'Account reset initiated. Awaiting fresh metrics.',
      account_id: account.id,
      account_number: account.accountNumber,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const updateMt5Password = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { account_id, account_number, mt5_password } = req.body as UpdateMt5PasswordPayload
    const accountId = account_id != null ? Number(account_id) : null
    const accountNumber = account_number ? String(account_number).trim() : null
    const newPassword = String(mt5_password ?? '').trim()

    if (!accountId && !accountNumber) {
      throw new ApiError('account_id or account_number is required', 400)
    }

    if (!newPassword) {
      throw new ApiError('mt5_password is required', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: accountId ? { id: accountId } : { accountNumber: accountNumber ?? '' },
      include: { user: true },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    if (String(account.platform ?? '').toLowerCase() !== 'mt5') {
      throw new ApiError('Password update is only supported for MT5 accounts', 400)
    }

    const updated = await prisma.cTraderAccount.update({
      where: { id: account.id },
      data: { mt5Password: newPassword },
    })

    res.json({
      message: 'MT5 password updated successfully',
      account_id: updated.id,
      account_number: updated.accountNumber,
      mt5_login: updated.mt5Login ?? updated.accountNumber,
      mt5_server: updated.mt5Server ?? null,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const replaceUserAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { account_id, account_number, platform, next_phase, target_phase } = req.body as ReplaceAccountPayload
    const accountId = account_id != null ? Number(account_id) : null
    const accountNumber = account_number ? String(account_number).trim() : null
    const targetPlatform = String(platform ?? '').trim().toLowerCase()
    const advanceToNextPhase = Boolean(next_phase)

    if (!accountId && !accountNumber) {
      throw new ApiError('account_id or account_number is required', 400)
    }

    if (!['mt5', 'ctrader'].includes(targetPlatform)) {
      throw new ApiError('platform must be mt5 or ctrader', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: accountId ? { id: accountId } : { accountNumber: accountNumber ?? '' },
      include: { user: true },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    if (!account.userId) {
      throw new ApiError('Account has no assigned user', 400)
    }

    const explicitTargetPhase = normalizeReplacementPhaseInput(target_phase)
    const targetPhase = explicitTargetPhase
      ?? resolveReplacementPhase(account.challengeType ?? 'two_step', account.phase, advanceToNextPhase)

    if (!targetPhase) {
      throw new ApiError('This account cannot be moved to the requested replacement phase', 400)
    }

    if (!isAllowedReplacementPhase(account.challengeType ?? 'two_step', targetPhase)) {
      throw new ApiError('Selected replacement phase is not allowed for this challenge type', 400)
    }

    const resolvedCurrency = resolveChallengeCurrency(account.challengeType, account.currency ?? null)
    const normalizedAccountSizeDigits = normalizeAccountSize(account.accountSize).replace(/\D/g, '')
    const baseChallengeId = normalizeChallengeBase(account.challengeId)
    const targetChallengeId = buildChallengeIdForPhase(baseChallengeId, targetPhase)
    const archivedChallengeId = `${account.challengeId}-replaced-${Date.now()}`
    const objectiveFields = await buildObjectiveFields({
      accountSize: account.accountSize,
      challengeType: account.challengeType ?? 'two_step',
      phase: targetPhase,
    })

    const assignedAccount = await prisma.$transaction(async (tx) => {
      const readyAccounts = await tx.$queryRaw<{ id: number; accountNumber: string; mt5Login: string | null }[]>`
        SELECT id, "accountNumber", "mt5Login"
        FROM "CTraderAccount"
        WHERE lower(status) = 'ready'
          AND "userId" IS NULL
          AND lower("currency") = lower(${resolvedCurrency})
          AND lower("platform") = lower(${targetPlatform})
          AND regexp_replace(lower("accountSize"), '[^0-9]', '', 'g') = ${normalizedAccountSizeDigits}
          AND (
            lower(${targetPlatform}) <> 'mt5'
            OR (
              "mt5Server" IS NOT NULL
              AND "mt5Password" IS NOT NULL
            )
          )
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE
      `

      const ready = readyAccounts[0]
      if (!ready) {
        throw new ApiError('No matching ready account found for replacement', 409)
      }

      await tx.cTraderAccount.update({
        where: { id: account.id },
        data: {
          status: 'completed',
          challengeId: archivedChallengeId,
        },
      })

      const existingChallenge = await tx.cTraderAccount.findFirst({
        where: { challengeId: targetChallengeId },
        select: { id: true },
      })
      if (existingChallenge) {
        throw new ApiError(`Target challenge ID already exists: ${targetChallengeId}`, 409)
      }

      const updateData = {
        challengeId: targetChallengeId,
        userId: account.userId,
        challengeType: account.challengeType,
        phase: targetPhase,
        currency: resolvedCurrency,
        ...objectiveFields,
        status: 'assigned_pending_access',
        accessStatus: 'pending',
        assignedAt: new Date(),
      } as Prisma.CTraderAccountUncheckedUpdateInput

      if (targetPlatform === 'mt5') {
        updateData.mt5Login = ready.mt5Login ?? ready.accountNumber
      }

      return tx.cTraderAccount.update({
        where: { id: ready.id },
        data: updateData,
      })
    })

    try {
      await pushActiveAccountAdd({
        accountNumber: assignedAccount.accountNumber,
        phase: assignedAccount.phase,
        status: assignedAccount.status,
        challengeType: assignedAccount.challengeType,
      })
    } catch (error) {
      console.error('Failed to push replacement account active state', error)
    }

    res.json({
      message: 'Replacement account assigned successfully',
      completed_account_id: account.id,
      completed_account_number: account.accountNumber,
      completed_challenge_id: archivedChallengeId,
      assigned_account_id: assignedAccount.id,
      assigned_account_number: assignedAccount.accountNumber,
      assigned_challenge_id: assignedAccount.challengeId,
      assigned_phase: assignedAccount.phase,
      assigned_challenge_type: assignedAccount.challengeType,
      assigned_platform: assignedAccount.platform,
      assigned_status: assignedAccount.status,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const changeUserAccountPhase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { account_id, account_number, target_phase } = req.body as ChangeAccountPhasePayload
    const accountId = account_id != null ? Number(account_id) : null
    const accountNumber = account_number ? String(account_number).trim() : null

    if (!accountId && !accountNumber) {
      throw new ApiError('account_id or account_number is required', 400)
    }

    const targetPhase = normalizeReplacementPhaseInput(target_phase)
    if (!targetPhase) {
      throw new ApiError('target_phase must be phase_1, phase_2, or funded', 400)
    }

    const account = await prisma.cTraderAccount.findFirst({
      where: accountId ? { id: accountId } : { accountNumber: accountNumber ?? '' },
      include: { user: true },
    })

    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    if (!account.userId) {
      throw new ApiError('Account has no assigned user', 400)
    }

    if (!isAllowedReplacementPhase(account.challengeType ?? 'two_step', targetPhase)) {
      throw new ApiError('Selected phase is not allowed for this challenge type', 400)
    }

    const baseChallengeId = normalizeChallengeBase(account.challengeId)
    const nextChallengeId = buildChallengeIdForPhase(baseChallengeId, targetPhase)

    const existingChallenge = await prisma.cTraderAccount.findFirst({
      where: {
        challengeId: nextChallengeId,
        NOT: { id: account.id },
      },
      select: { id: true },
    })

    if (existingChallenge) {
      throw new ApiError(`Target challenge ID already exists: ${nextChallengeId}`, 409)
    }

    const objectiveFields = await buildObjectiveFields({
      accountSize: account.accountSize,
      challengeType: account.challengeType ?? 'two_step',
      phase: targetPhase,
    })

    const updated = await prisma.cTraderAccount.update({
      where: { id: account.id },
      data: {
        challengeId: nextChallengeId,
        phase: targetPhase,
        ...objectiveFields,
      } as Prisma.CTraderAccountUncheckedUpdateInput,
    })

    try {
      await pushActiveAccountAdd({
        accountNumber: updated.accountNumber,
        phase: updated.phase,
        status: updated.status,
        challengeType: updated.challengeType,
      })
    } catch (error) {
      console.error('Failed to push updated account phase active state', error)
    }

    res.json({
      message: 'Account phase updated successfully',
      account_id: updated.id,
      account_number: updated.accountNumber,
      challenge_id: updated.challengeId,
      phase: updated.phase,
      status: updated.status,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listCTraderAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, platform } = req.query as ListCTraderQuery & { platform?: string }
    const normalizedStatus = status?.toLowerCase()
    const baseWhere: Prisma.CTraderAccountWhereInput = normalizedStatus === 'awaiting-next-stage'
      ? { status: { equals: 'awaiting_reset', mode: Prisma.QueryMode.insensitive } }
      : status
        ? { status: { equals: status, mode: Prisma.QueryMode.insensitive } }
        : {}
    const normalizedPlatform = platform?.toLowerCase()
    const where: Prisma.CTraderAccountWhereInput = {
      ...baseWhere,
      ...(normalizedPlatform ? { platform: { equals: normalizedPlatform, mode: Prisma.QueryMode.insensitive } } : {}),
    }
    const accounts = await prisma.cTraderAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    })

    res.json({ accounts: accounts.map((account) => ({
      id: account.id,
      account_number: account.accountNumber,
      server: account.brokerName,
      account_size: account.accountSize,
      currency: account.currency,
      challenge_type: account.challengeType,
      status: account.status,
      phase: account.phase,
      challenge_id: account.challengeId,
      assigned_user_id: account.userId,
      assigned_user_email: account.user?.email ?? null,
      assigned_at: account.assignedAt?.toISOString() ?? null,
      assignment_mode: account.userId ? 'automatic' : null,
      assigned_by_admin_name: null,
      access_status: (account as { accessStatus?: string | null }).accessStatus ?? null,
      platform: account.platform ?? 'ctrader',
      mt5_login: account.mt5Login ?? null,
      mt5_server: account.mt5Server ?? null,
      mt5_password: account.mt5Password ?? null,
      created_at: account.createdAt.toISOString(),
      updated_at: account.updatedAt.toISOString(),
    })) })
  } catch (err) {
    next(err as Error)
  }
}

export const logCTraderCredentialView = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { account_id, account_number, platform, scope } = req.body as {
      account_id?: number
      account_number?: string
      platform?: string
      scope?: string
    }
    const normalizedPlatform = String(platform ?? '').toLowerCase()
    if (normalizedPlatform !== 'mt5') {
      throw new ApiError('Only MT5 credential views are logged', 400)
    }
    const account = account_id
      ? await prisma.cTraderAccount.findUnique({ where: { id: Number(account_id) }, select: { id: true } })
      : account_number
        ? await prisma.cTraderAccount.findFirst({ where: { accountNumber: String(account_number) }, select: { id: true } })
        : null
    if (!account) {
      throw new ApiError('Account not found', 404)
    }

    const adminEmail = (req as any).user?.email ?? null
    await recordCredentialView({
      accountId: account.id,
      userId: null,
      metadata: {
        scope: scope ?? 'admin',
        platform: normalizedPlatform,
        action: 'view_credentials',
        admin_email: adminEmail,
      },
    })

    res.json({ status: 'logged' })
  } catch (err) {
    next(err as Error)
  }
}

export const getCTraderSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      total,
      ready,
      assigned,
      disabled,
      ctraderTotal,
      ctraderReady,
      ctraderAssigned,
      ctraderDisabled,
      mt5Total,
      mt5Ready,
      mt5Assigned,
      mt5Disabled,
    ] = await Promise.all([
      prisma.cTraderAccount.count(),
      prisma.cTraderAccount.count({
        where: { status: { equals: 'ready', mode: 'insensitive' } },
      }),
      prisma.cTraderAccount.count({ where: { userId: { not: null } } }),
      prisma.cTraderAccount.count({
        where: { status: { equals: 'disabled', mode: 'insensitive' } },
      }),
      prisma.cTraderAccount.count({
        where: { platform: { equals: 'ctrader', mode: 'insensitive' } },
      }),
      prisma.cTraderAccount.count({
        where: { status: { equals: 'ready', mode: 'insensitive' }, platform: { equals: 'ctrader', mode: 'insensitive' } },
      }),
      prisma.cTraderAccount.count({
        where: { userId: { not: null }, platform: { equals: 'ctrader', mode: 'insensitive' } },
      }),
      prisma.cTraderAccount.count({
        where: { status: { equals: 'disabled', mode: 'insensitive' }, platform: { equals: 'ctrader', mode: 'insensitive' } },
      }),
      prisma.cTraderAccount.count({
        where: { platform: { equals: 'mt5', mode: 'insensitive' } },
      }),
      prisma.cTraderAccount.count({
        where: { status: { equals: 'ready', mode: 'insensitive' }, platform: { equals: 'mt5', mode: 'insensitive' } },
      }),
      prisma.cTraderAccount.count({
        where: { userId: { not: null }, platform: { equals: 'mt5', mode: 'insensitive' } },
      }),
      prisma.cTraderAccount.count({
        where: { status: { equals: 'disabled', mode: 'insensitive' }, platform: { equals: 'mt5', mode: 'insensitive' } },
      }),
    ])

    const summary: AccountSummary = {
      total,
      ready,
      assigned,
      disabled,
      ctrader: {
        total: ctraderTotal,
        ready: ctraderReady,
        assigned: ctraderAssigned,
        disabled: ctraderDisabled,
      },
      mt5: {
        total: mt5Total,
        ready: mt5Ready,
        assigned: mt5Assigned,
        disabled: mt5Disabled,
      },
    }

    res.json(summary)
  } catch (err) {
    next(err as Error)
  }
}

export const downloadCTraderTemplate = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const template = [
      'account_number,broker,account_size,currency,status,platform,mt5_server,mt5_password',
      '100001,ICMarkets,"$2,000",USD,Ready,ctrader,,',
      '100002,ICMarkets,"$10,000",USD,Ready,ctrader,,',
      '200001,ICMarkets,"₦200,000",NGN,Ready,ctrader,,',
      '300001,ICMarkets,"$10,000",USD,Ready,mt5,ICMarkets-Live,secret',
    ].join('\n')

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="accounts_pool_template.csv"')
    res.send(template)
  } catch (err) {
    next(err as Error)
  }
}