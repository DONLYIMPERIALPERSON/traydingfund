import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { Prisma } from '@prisma/client'
import { requestAccountAccess } from '../../services/accessEngine.service'
import { assignReadyAccountFromPool, buildBaseChallengeId, normalizeChallengeBase, resolveChallengeCurrency } from '../ctrader/ctrader.assignment'

type UploadAccountPayload = {
  account_number: string
  broker: string
  account_size: string
  status?: string
  currency?: string
}

type AccountSummary = {
  total: number
  ready: number
  assigned: number
  disabled: number
}

type ListCTraderQuery = {
  status?: string
}

type ForceNextStagePayload = {
  account_id?: number
}

const normalizeAccountSize = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return raw
  let value = Number(digits)
  if (digits.length <= 3) {
    value *= 1000
  }
  if (!Number.isFinite(value) || value <= 0) return raw
  return `$${value.toLocaleString('en-US')}`
}

export const uploadCTraderAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = (req.body as { accounts?: UploadAccountPayload[] })?.accounts
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      throw new ApiError('accounts array is required', 400)
    }

    const normalized = accounts.map((account) => ({
      accountNumber: String(account.account_number ?? '').trim(),
      brokerName: String(account.broker ?? '').trim(),
      accountSize: normalizeAccountSize(String(account.account_size ?? '').trim()),
      status: String(account.status ?? 'Ready').trim(),
      currency: String(account.currency ?? 'USD').trim().toUpperCase(),
    }))

    normalized.forEach((account, index) => {
      if (!account.accountNumber || !account.brokerName || !account.accountSize) {
        throw new ApiError(`Invalid account payload at index ${index}`, 400)
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
          brokerName: account.brokerName,
          accountNumber: account.accountNumber,
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
      where: { assignmentStatus: 'pending_assign', status: 'pending' },
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
      })

      if (!assigned) break

      await prisma.order.update({
        where: { id: order.id },
        data: { assignmentStatus: 'assigned' },
      })

      await requestAccountAccess({
        user_email: order.user.email,
        user_name: order.user.fullName ?? undefined,
        account_type: order.challengeType ?? undefined,
        account_phase: order.phase ?? undefined,
        account_size: assigned.accountSize ?? order.accountSize ?? undefined,
        account_number: assigned.accountNumber,
        broker: assigned.brokerName,
        platform: 'ctrader',
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
    if (!resolvedUser?.email) {
      res.json({
        message: 'Next stage assigned',
        assigned_challenge_id: assignedAccount.challengeId,
        assigned_account_number: assignedAccount.accountNumber,
      })
      return
    }

    const email = resolvedUser!.email
    const fullName = resolvedUser!.fullName ?? undefined
    await requestAccountAccess({
      user_email: email,
      user_name: fullName,
      account_type: resolvedAccount.challengeType ?? undefined,
      account_phase: resolvedNextPhase ?? undefined,
      account_size: assignedAccount.accountSize ?? resolvedAccount.accountSize ?? undefined,
      account_number: assignedAccount.accountNumber,
      broker: assignedAccount.brokerName,
      platform: 'ctrader',
    })

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

export const listCTraderAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query as ListCTraderQuery
    const normalizedStatus = status?.toLowerCase()
    const where: Prisma.CTraderAccountWhereInput = normalizedStatus === 'awaiting-next-stage'
      ? { status: { equals: 'awaiting_reset', mode: Prisma.QueryMode.insensitive } }
      : status
        ? { status: { equals: status, mode: Prisma.QueryMode.insensitive } }
        : {}
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
      created_at: account.createdAt.toISOString(),
      updated_at: account.updatedAt.toISOString(),
    })) })
  } catch (err) {
    next(err as Error)
  }
}

export const getCTraderSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ready = await prisma.cTraderAccount.count({
      where: { status: { equals: 'ready', mode: 'insensitive' } },
    })
    const total = ready
    const assigned = await prisma.cTraderAccount.count({ where: { userId: { not: null } } })
    const disabled = await prisma.cTraderAccount.count({
      where: { status: { equals: 'disabled', mode: 'insensitive' } },
    })

    const summary: AccountSummary = {
      total,
      ready,
      assigned,
      disabled,
    }

    res.json(summary)
  } catch (err) {
    next(err as Error)
  }
}

export const downloadCTraderTemplate = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const template = [
      'account_number,broker,account_size,currency,status',
      '100001,ICMarkets,"$2,000",USD,Ready',
      '100002,ICMarkets,"$10,000",USD,Ready',
      '200001,ICMarkets,"₦200,000",NGN,Ready',
    ].join('\n')

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="ctrader_accounts_template.csv"')
    res.send(template)
  } catch (err) {
    next(err as Error)
  }
}