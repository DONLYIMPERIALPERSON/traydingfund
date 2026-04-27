import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { env } from '../../config/env'
import { pushActiveAccountFullSync } from '../../services/ctraderEngine.service'

const ACTIVE_STATUSES = ['active', 'admin_checking']

export const listActiveCTraderAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = req.header('X-ENGINE-SECRET')
    const allowedSecrets = [env.ctraderEngineSecret, env.mt5EngineSecret].filter(Boolean)
    if (!secret || !allowedSecrets.includes(secret)) {
      throw new ApiError('Unauthorized engine request', 401)
    }

    const accounts = await prisma.cTraderAccount.findMany({
      where: {
        status: { in: ACTIVE_STATUSES, mode: 'insensitive' },
        platform: { equals: 'mt5', mode: 'insensitive' },
      },
      include: { metrics: { select: { balance: true } } },
      orderBy: { updatedAt: 'desc' },
    })

    const payload = accounts.map((account) => {
      const challengeType = String(account.challengeType ?? '')
        .toLowerCase()
        .replace(/-/g, '_')
      const phase = String(account.phase ?? '')
        .toLowerCase()
        .replace(/-/g, '_')
      const accountType = challengeType === 'breezy'
        ? 'breezy'
        : challengeType === 'instant_funded'
        ? 'instant_funded'
        : (challengeType && phase ? `${challengeType}_${phase}` : challengeType)
      return {
        accountNumber: account.accountNumber,
        platform: account.platform ?? 'ctrader',
        balance: account.metrics?.balance ?? account.initialBalance ?? 0,
        status: account.status,
        phase: account.phase,
        challengeType: account.challengeType,
        accountType,
        accountSize: account.accountSize ?? account.initialBalance ?? null,
        mt5Login: account.mt5Login ?? account.accountNumber,
        mt5Password: account.mt5Password,
        mt5Server: account.mt5Server ?? account.brokerName,
      }
    })

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