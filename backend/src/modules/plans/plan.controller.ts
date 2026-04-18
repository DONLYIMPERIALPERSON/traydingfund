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

const formatMoney = (amount: number, currency: string) => {
  const normalized = currency?.toUpperCase() === 'NGN' ? 'NGN' : 'USD'
  if (normalized === 'NGN') {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export const listPublicPlans = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await (prisma as typeof prisma & { challengePlan: any }).challengePlan.findMany({
      where: { enabled: true },
      orderBy: [{ createdAt: 'asc' }],
    })

    const fallbackPlans: ChallengePlanRecord[] = [
      { planId: '2k', name: '$2K', price: 12, accountSize: '$2K', currency: 'USD', status: 'Available', enabled: true, challengeType: 'two_step', phase: 'phase_1' },
      { planId: '10k', name: '$10K', price: 81, accountSize: '$10K', currency: 'USD', status: 'Available', enabled: true, challengeType: 'two_step', phase: 'phase_1' },
      { planId: '30k', name: '$30K', price: 163, accountSize: '$30K', currency: 'USD', status: 'Available', enabled: true, challengeType: 'two_step', phase: 'phase_1' },
      { planId: '50k', name: '$50K', price: 203, accountSize: '$50K', currency: 'USD', status: 'Available', enabled: true, challengeType: 'two_step', phase: 'phase_1' },
      { planId: '100k', name: '$100K', price: 354, accountSize: '$100K', currency: 'USD', status: 'Available', enabled: true, challengeType: 'two_step', phase: 'phase_1' },
      { planId: '200k', name: '$200K', price: 681, accountSize: '$200K', currency: 'USD', status: 'Available', enabled: true, challengeType: 'two_step', phase: 'phase_1' },
      { planId: 'attic_200000', name: 'Attic ₦200,000', price: 1500, accountSize: '₦200,000', currency: 'NGN', status: 'Available', enabled: true, challengeType: 'attic', phase: 'phase_1' },
      { planId: '200000', name: '₦200,000', price: 5000, accountSize: '₦200,000', currency: 'NGN', status: 'Available', enabled: true, challengeType: 'ngn_standard', phase: 'phase_1' },
      { planId: '500000', name: '₦500,000', price: 11500, accountSize: '₦500,000', currency: 'NGN', status: 'Available', enabled: true, challengeType: 'ngn_standard', phase: 'phase_1' },
      { planId: '800000', name: '₦800,000', price: 17000, accountSize: '₦800,000', currency: 'NGN', status: 'Available', enabled: true, challengeType: 'ngn_standard', phase: 'phase_1' },
    ]

    const databasePlans = (plans ?? []) as ChallengePlanRecord[]
    const existingPlanIds = new Set(databasePlans.map((plan) => plan.planId))
    const mergedFallbackPlans = fallbackPlans.filter((plan) => !existingPlanIds.has(plan.planId))
    const resolvedPlans = [...databasePlans, ...mergedFallbackPlans] as ChallengePlanRecord[]

    res.json({
      plans: resolvedPlans.map((plan) => ({
        id: plan.planId,
        name: plan.name,
        price: formatMoney(plan.price, plan.currency),
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