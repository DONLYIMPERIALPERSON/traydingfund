import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'

type ChallengePlanRecord = {
  planId: string
  name: string
  price: number
  accountSize: string
  currency: string
  maxDrawdown?: string | null
  profitTarget?: string | null
  phases?: string | null
  minTradingDays?: string | null
  profitSplit?: string | null
  profitCap?: string | null
  payoutFrequency?: string | null
  status: string
  enabled: boolean
  challengeType?: string | null
  phase?: string | null
}

export const listPublicPlans = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await (prisma as typeof prisma & { challengePlan: any }).challengePlan.findMany({
      where: { enabled: true },
      orderBy: [{ createdAt: 'asc' }],
    })

    res.json({
      plans: (plans as ChallengePlanRecord[]).map((plan) => ({
        id: plan.planId,
        name: plan.name,
        price: plan.price,
        account_size: plan.accountSize,
        currency: plan.currency,
        max_drawdown: plan.maxDrawdown,
        profit_target: plan.profitTarget,
        phases: plan.phases,
        min_trading_days: plan.minTradingDays,
        profit_split: plan.profitSplit,
        profit_cap: plan.profitCap,
        payout_frequency: plan.payoutFrequency,
        status: plan.status,
        enabled: plan.enabled,
        challenge_type: plan.challengeType,
        phase: plan.phase,
      })),
    })
  } catch (err) {
    next(err as Error)
  }
}