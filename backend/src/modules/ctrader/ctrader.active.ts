import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { env } from '../../config/env'
import { pushActiveAccountFullSync } from '../../services/ctraderEngine.service'

const ACTIVE_STATUSES = ['active', 'assigned', 'assigned_pending_access', 'funded', 'awaiting_reset', 'withdraw_requested']

export const listActiveCTraderAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = req.header('X-ENGINE-SECRET')
    if (!secret || secret !== env.ctraderEngineSecret) {
      throw new ApiError('Unauthorized engine request', 401)
    }

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

    if (req.query?.push_engine === 'true') {
      try {
        await pushActiveAccountFullSync(payload)
      } catch (error) {
        console.error('Failed to push active account sync', error)
      }
    }

    res.json(payload)
  } catch (err) {
    next(err as Error)
  }
}