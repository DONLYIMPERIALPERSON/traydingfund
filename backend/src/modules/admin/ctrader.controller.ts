import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { Prisma } from '@prisma/client'
import { requestAccountAccess } from '../../services/accessEngine.service'
import { recordCredentialView } from '../../services/emailLog.service'
import { assignReadyAccountFromPool, buildBaseChallengeId, normalizeChallengeBase, resolveChallengeCurrency } from '../ctrader/ctrader.assignment'

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

    const normalized = accounts.map((account) => {
      const accountNumber = String(account.account_number ?? '').trim()
      const platform = String(account.platform ?? 'ctrader').trim().toLowerCase()
      return {
        accountNumber,
        brokerName: String(account.broker ?? '').trim(),
        accountSize: normalizeAccountSize(String(account.account_size ?? '').trim()),
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