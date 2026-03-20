import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { Prisma } from '@prisma/client'
import { requestAccountAccess } from '../../services/accessEngine.service'
import { assignReadyAccountFromPool, buildBaseChallengeId } from '../ctrader/ctrader.assignment'

type UploadAccountPayload = {
  account_number: string
  broker: string
  account_size: string
  status?: string
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

    const toCreate = uniqueAccounts.filter((account) => !existingIds.has(account.challengeId))
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
        baseChallengeId: buildBaseChallengeId(order.id),
      })

      if (!assigned) break

      await prisma.order.update({
        where: { id: order.id },
        data: { assignmentStatus: 'assigned' },
      })

      await requestAccountAccess({
        user_email: order.user.email,
        account_number: assigned.accountNumber,
        broker: assigned.brokerName,
        platform: 'ctrader',
      })
    }

    res.status(201).json({
      created: toCreate.length,
      skipped: Array.from(existingIds),
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
      ? { status: { equals: 'passed', mode: Prisma.QueryMode.insensitive } }
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