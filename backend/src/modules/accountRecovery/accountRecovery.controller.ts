import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { buildObjectiveFields } from '../ctrader/ctrader.objectives'
import { normalizeAccountSize, resolveChallengeCurrency } from '../ctrader/ctrader.assignment'
import { pushActiveAccountAdd } from '../../services/ctraderEngine.service'

const ALLOWED_MT5_SERVERS = ['Exness-MT5Trial9', 'Exness-MT5Trial10'] as const

type AuthRequest = Request & { user?: { id: number; email: string } }

const ensureUser = (req: AuthRequest) => {
  if (!req.user) throw new ApiError('Unauthorized', 401)
  return req.user
}

const normalizeChallengeType = (value: string) => {
  const normalized = value.toLowerCase().trim()
  if (normalized === '2 step') return 'two_step'
  if (normalized === '1 step') return 'one_step'
  if (normalized === 'instant funded') return 'instant_funded'
  if (normalized === 'standard account') return 'ngn_standard'
  if (normalized === 'flexi account') return 'ngn_flexi'
  return normalized.replace(/\s+/g, '_')
}

const normalizePhase = (value: string) => {
  const normalized = value.toLowerCase().trim()
  if (normalized === 'phase 1') return 'phase_1'
  if (normalized === 'phase 2') return 'phase_2'
  if (normalized === 'funded') return 'funded'
  return normalized.replace(/\s+/g, '_')
}

const serializeRecoveryRequest = (request: {
  id: number
  email: string
  accountNumber: string
  platform: string
  brokerName: string | null
  mt5Login: string | null
  mt5Server: string | null
  phase: string
  accountType: string
  accountSize: string
  status: string
  reviewNote: string | null
  declineReason: string | null
  submittedAt: Date
  reviewedAt: Date | null
  reviewedBy: string | null
  recoveredAccountId: number | null
  userId: number
  user?: { email: string; fullName: string | null } | null
}) => ({
  id: request.id,
  user_id: request.userId,
  user_name: request.user?.fullName ?? request.user?.email ?? null,
  user_email: request.user?.email ?? request.email,
  email: request.email,
  account_number: request.accountNumber,
  platform: request.platform,
  broker_name: request.brokerName,
  mt5_login: request.mt5Login,
  mt5_server: request.mt5Server,
  phase: request.phase,
  account_type: request.accountType,
  account_size: request.accountSize,
  status: request.status,
  review_note: request.reviewNote,
  decline_reason: request.declineReason,
  submitted_at: request.submittedAt.toISOString(),
  reviewed_at: request.reviewedAt?.toISOString() ?? null,
  reviewed_by: request.reviewedBy,
  recovered_account_id: request.recoveredAccountId,
})

export const submitRecoveryRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req as AuthRequest)
    const { email, account_number, platform, phase, account_type, account_size } = req.body as {
      email: string
      account_number: string
      platform: 'ctrader' | 'mt5'
      phase: string
      account_type: string
      account_size: string
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedEmail !== user.email.toLowerCase()) {
      throw new ApiError('Recovery email must match your signed-in account email', 400)
    }

    const normalizedPlatform = String(platform ?? '').trim().toLowerCase()
    if (!['ctrader', 'mt5'].includes(normalizedPlatform)) {
      throw new ApiError('platform must be ctrader or mt5', 400)
    }

    const existingPending = await prisma.accountRecoveryRequest.findFirst({
      where: {
        userId: user.id,
        accountNumber: account_number.trim(),
        platform: normalizedPlatform,
        status: 'pending',
      },
    })
    if (existingPending) {
      throw new ApiError('A pending recovery request already exists for this account number', 409)
    }

    const created = await prisma.accountRecoveryRequest.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        accountNumber: account_number.trim(),
        platform: normalizedPlatform,
        phase: phase.trim(),
        accountType: account_type.trim(),
        accountSize: account_size.trim(),
        status: 'pending',
      },
    })

    res.status(201).json({
      message: 'Recovery request submitted successfully',
      request: serializeRecoveryRequest(created),
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listMyRecoveryRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req as AuthRequest)
    const requests = await prisma.accountRecoveryRequest.findMany({
      where: { userId: user.id },
      orderBy: { submittedAt: 'desc' },
    })

    res.json({ requests: requests.map(serializeRecoveryRequest) })
  } catch (err) {
    next(err as Error)
  }
}

export const listAdminRecoveryRequests = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.accountRecoveryRequest.findMany({
      orderBy: { submittedAt: 'desc' },
      include: { user: true },
    })

    res.json({ requests: requests.map(serializeRecoveryRequest) })
  } catch (err) {
    next(err as Error)
  }
}

export const reviewRecoveryRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admin = (req as AuthRequest).user
    const requestId = Number(req.params.id)
    if (!Number.isFinite(requestId)) {
      throw new ApiError('Invalid recovery request id', 400)
    }

    const { action, review_note, decline_reason, platform, broker_name, mt5_login, mt5_server, mt5_password } = req.body as {
      action?: 'approve' | 'decline'
      review_note?: string
      decline_reason?: string
      platform?: 'ctrader' | 'mt5'
      broker_name?: string
      mt5_login?: string
      mt5_server?: string
      mt5_password?: string
    }

    if (action !== 'approve' && action !== 'decline') {
      throw new ApiError('action must be approve or decline', 400)
    }

    const existingRequest = await prisma.accountRecoveryRequest.findUnique({ where: { id: requestId } })
    if (!existingRequest) {
      throw new ApiError('Recovery request not found', 404)
    }
    if (existingRequest.status !== 'pending') {
      throw new ApiError('Recovery request has already been reviewed', 409)
    }

    if (action === 'decline') {
      const declined = await prisma.accountRecoveryRequest.update({
        where: { id: requestId },
        data: {
          status: 'declined',
          reviewNote: review_note?.trim() || null,
          declineReason: decline_reason?.trim() || 'Declined by admin',
          reviewedAt: new Date(),
          reviewedBy: admin?.email ?? 'admin',
        },
      })

      res.json({ message: 'Recovery request declined', request: serializeRecoveryRequest(declined) })
      return
    }

    const resolvedPlatform = String(platform ?? existingRequest.platform ?? 'ctrader').toLowerCase()
    if (!['ctrader', 'mt5'].includes(resolvedPlatform)) {
      throw new ApiError('platform must be ctrader or mt5', 400)
    }
    if (resolvedPlatform === 'mt5' && !mt5_password?.trim()) {
      throw new ApiError('MT5 password is required before approval', 400)
    }
    if (resolvedPlatform === 'mt5' && !ALLOWED_MT5_SERVERS.includes(String(mt5_server ?? '') as (typeof ALLOWED_MT5_SERVERS)[number])) {
      throw new ApiError('mt5_server must be Exness-MT5Trial9 or Exness-MT5Trial10', 400)
    }

    const duplicateAccount = await prisma.cTraderAccount.findFirst({
      where: {
        accountNumber: existingRequest.accountNumber.trim(),
        platform: { equals: resolvedPlatform, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (duplicateAccount) {
      throw new ApiError('An account with this account number already exists on the platform', 409)
    }

    const normalizedChallengeType = normalizeChallengeType(existingRequest.accountType)
    const normalizedPhase = normalizePhase(existingRequest.phase)
    const normalizedAccountSize = normalizeAccountSize(existingRequest.accountSize)
    const resolvedCurrency = resolveChallengeCurrency(normalizedChallengeType, null)
    const objectiveFields = await buildObjectiveFields({
      accountSize: normalizedAccountSize,
      challengeType: normalizedChallengeType,
      phase: normalizedPhase,
    })

    const createdAccount = await prisma.cTraderAccount.create({
      data: {
        challengeId: `REC-${resolvedPlatform.toUpperCase()}-${requestId}-${existingRequest.accountNumber.trim()}`,
        platform: resolvedPlatform,
        accountSize: normalizedAccountSize,
        currency: resolvedCurrency,
        phase: normalizedPhase,
        challengeType: normalizedChallengeType,
        status: 'active',
        accessStatus: 'granted',
        brokerName: resolvedPlatform === 'mt5'
          ? String(mt5_server)
          : (broker_name?.trim() || existingRequest.brokerName?.trim() || 'Recovered cTrader Account'),
        accountNumber: existingRequest.accountNumber.trim(),
        mt5Login: resolvedPlatform === 'mt5' ? existingRequest.accountNumber.trim() : null,
        mt5Server: resolvedPlatform === 'mt5' ? String(mt5_server) : null,
        mt5Password: resolvedPlatform === 'mt5' ? mt5_password?.trim() || null : null,
        userId: existingRequest.userId,
        assignedAt: new Date(),
        accessGrantedAt: new Date(),
        startedAt: new Date(),
        ...objectiveFields,
      },
    })

    try {
      await pushActiveAccountAdd({
        accountNumber: createdAccount.accountNumber,
        phase: createdAccount.phase,
        status: createdAccount.status,
        challengeType: createdAccount.challengeType,
      })
    } catch (error) {
      console.error('Failed to push recovered account to engine', error)
    }

    const approved = await prisma.accountRecoveryRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        reviewNote: review_note?.trim() || null,
        reviewedAt: new Date(),
        reviewedBy: admin?.email ?? 'admin',
        platform: resolvedPlatform,
        brokerName: resolvedPlatform === 'mt5' ? String(mt5_server) : (broker_name?.trim() || existingRequest.brokerName),
        mt5Login: resolvedPlatform === 'mt5' ? existingRequest.accountNumber.trim() : null,
        mt5Server: resolvedPlatform === 'mt5' ? String(mt5_server) : null,
        mt5Password: resolvedPlatform === 'mt5' ? mt5_password?.trim() || null : null,
        recoveredAccountId: createdAccount.id,
      },
      include: { user: true },
    })

    res.json({ message: 'Recovery request approved', request: serializeRecoveryRequest(approved) })
  } catch (err) {
    next(err as Error)
  }
}