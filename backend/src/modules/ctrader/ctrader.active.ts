import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { env } from '../../config/env'

const ACTIVE_STATUSES = ['active', 'assigned', 'assigned_pending_access', 'funded']

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

    res.json(accounts.map((account) => ({
      accountNumber: account.accountNumber,
      balance: account.metrics?.balance ?? account.initialBalance ?? 0,
      status: account.status,
      phase: account.phase,
      challengeType: account.challengeType,
    })))
  } catch (err) {
    next(err as Error)
  }
}