import 'dotenv/config'

import { prisma } from '../config/prisma'
import {
  assignReadyAccountFromPool,
  normalizeChallengeBase,
} from '../modules/ctrader/ctrader.assignment'
import { buildObjectiveFields, parseAccountSize } from '../modules/ctrader/ctrader.objectives'

const now = new Date()

type FlowConfig = {
  label: string
  challengeType: string
  currency: string
  accountSize: string
  phases: string[]
}

const buildAccountNumber = (prefix: string, index: number) => `SIM-${prefix}-${Date.now()}-${index}`

const cleanupPreviousSimulationAccounts = async () => {
  await prisma.cTraderAccount.deleteMany({
    where: {
      status: 'ready',
      challengeId: { startsWith: 'READY-SIM-' },
    },
  })
}

const ensureTestUser = async (label: string) => {
  const email = `sim+${label}+${Date.now()}@machefunded.test`
  return prisma.user.create({
    data: {
      email,
      fullName: 'Simulation Trader',
      role: 'trader',
      status: 'active',
      kycStatus: 'verified',
      payoutMethodType: 'bank',
      payoutBankName: 'Test Bank',
      payoutBankCode: '000',
      payoutAccountNumber: '0001112223',
      payoutAccountName: 'Simulation Trader',
      payoutVerifiedAt: now,
    },
  })
}

const createReadyAccounts = async ({
  count,
  accountSize,
  currency,
  challengeType,
  label,
}: {
  count: number
  accountSize: string
  currency: string
  challengeType: string
  label: string
}) => {
  const rows = Array.from({ length: count }).map((_, index) => {
    const accountNumber = buildAccountNumber(label, index + 1)
    return {
      challengeId: `READY-${accountNumber}`,
      accountSize,
      currency,
      phase: 'phase_1',
      challengeType,
      status: 'ready',
      brokerName: 'SimBroker',
      accountNumber,
    }
  })

  await prisma.cTraderAccount.createMany({ data: rows })
}

const activateAccount = async (accountId: number) =>
  prisma.cTraderAccount.update({
    where: { id: accountId },
    data: {
      status: 'active',
      accessStatus: 'active',
      startedAt: now,
    },
  })

const passAccountPhase = async (accountId: number, phase: string) => {
  const account = await prisma.cTraderAccount.findUnique({ where: { id: accountId } })
  if (!account) throw new Error('Account not found')

  const objectives = await buildObjectiveFields({
    accountSize: account.accountSize,
    challengeType: account.challengeType ?? 'two_step',
    phase,
  })

  const initialBalance = objectives.initialBalance ?? parseAccountSize(account.accountSize) ?? 0
  const profitTarget = objectives.profitTargetAmount ?? initialBalance * 0.1
  const balance = initialBalance + profitTarget + 100
  const minTradingDays = objectives.minTradingDaysRequired ?? 0
  const firstTradeAt = new Date(Date.now() - (minTradingDays + 1) * 24 * 60 * 60 * 1000)

  await prisma.cTraderAccount.update({
    where: { id: account.id },
    data: {
      ...objectives,
      initialBalance,
      status: phase === 'funded' ? 'funded' : 'passed',
      passedAt: now,
    },
  })

  await prisma.cTraderAccountMetric.upsert({
    where: { accountId: account.id },
    create: {
      accountId: account.id,
      balance,
      equity: balance,
      unrealizedPnl: 0,
      maxPermittedLossLeft: (objectives.maxDdAmount ?? 0) * 0.8,
      highestBalance: balance,
      breachBalance: balance - (objectives.maxDdAmount ?? 0),
      profitTargetBalance: balance,
      winRate: 65,
      closedTradesCount: 10,
      winningTradesCount: 6,
      lotsTradedTotal: 1.2,
      todayClosedPnl: 0,
      todayTradesCount: 0,
      todayLotsTotal: 0,
      minTradingDaysRequired: objectives.minTradingDaysRequired ?? 0,
      minTradingDaysMet: true,
      stageElapsedHours: (minTradingDays + 1) * 24,
      scalpingViolationsCount: 0,
      dailyStartAt: now,
      dailyHighBalance: balance,
      dailyBreachBalance: balance - (objectives.dailyDdAmount ?? 0),
      firstTradeAt,
      totalTrades: 10,
      shortDurationViolation: false,
      lastBalance: balance,
      lastEquity: balance,
      capturedAt: now,
    },
    update: {
      balance,
      equity: balance,
      profitTargetBalance: balance,
      highestBalance: balance,
      breachBalance: balance - (objectives.maxDdAmount ?? 0),
      dailyHighBalance: balance,
      dailyBreachBalance: balance - (objectives.dailyDdAmount ?? 0),
      minTradingDaysMet: true,
      stageElapsedHours: (minTradingDays + 1) * 24,
      firstTradeAt,
      capturedAt: now,
      lastBalance: balance,
      lastEquity: balance,
    },
  })

  return { account, objectives, initialBalance, balance }
}

const simulatePayout = async (userId: number, fundedAccountId: number) => {
  const account = await prisma.cTraderAccount.findUnique({ where: { id: fundedAccountId } })
  if (!account) throw new Error('Funded account not found')

  const objectives = await buildObjectiveFields({
    accountSize: account.accountSize,
    challengeType: account.challengeType ?? 'two_step',
    phase: 'funded',
  })

  const initialBalance = objectives.initialBalance ?? parseAccountSize(account.accountSize) ?? 0
  const balance = initialBalance + 2500
  const profitRaw = balance - initialBalance
  const profitSplitPercent = objectives.profitSplitPercent ?? 80
  const profitSplitAmount = profitRaw * (profitSplitPercent / 100)

  await prisma.cTraderAccountMetric.upsert({
    where: { accountId: account.id },
    create: {
      accountId: account.id,
      balance,
      equity: balance,
      unrealizedPnl: 0,
      maxPermittedLossLeft: (objectives.maxDdAmount ?? 0) * 0.8,
      highestBalance: balance,
      breachBalance: balance - (objectives.maxDdAmount ?? 0),
      profitTargetBalance: balance,
      winRate: 70,
      closedTradesCount: 12,
      winningTradesCount: 8,
      lotsTradedTotal: 1.5,
      todayClosedPnl: 0,
      todayTradesCount: 0,
      todayLotsTotal: 0,
      minTradingDaysRequired: objectives.minTradingDaysRequired ?? 0,
      minTradingDaysMet: true,
      stageElapsedHours: 48,
      scalpingViolationsCount: 0,
      dailyStartAt: now,
      dailyHighBalance: balance,
      dailyBreachBalance: balance - (objectives.dailyDdAmount ?? 0),
      firstTradeAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      totalTrades: 12,
      shortDurationViolation: false,
      lastBalance: balance,
      lastEquity: balance,
      capturedAt: now,
    },
    update: {
      balance,
      equity: balance,
      profitTargetBalance: balance,
      highestBalance: balance,
      breachBalance: balance - (objectives.maxDdAmount ?? 0),
      dailyHighBalance: balance,
      dailyBreachBalance: balance - (objectives.dailyDdAmount ?? 0),
      minTradingDaysMet: true,
      stageElapsedHours: 48,
      capturedAt: now,
      lastBalance: balance,
      lastEquity: balance,
    },
  })

  const payout = await prisma.payout.create({
    data: {
      providerRef: `SIM-PAYOUT-${Date.now()}`,
      amountKobo: Math.round(profitSplitAmount * 100),
      status: 'pending_approval',
      profitSplitPercent,
      profitBaseAmount: profitRaw,
      profitAmount: profitSplitAmount,
      payoutMethodType: 'bank',
      payoutBankName: 'Test Bank',
      payoutBankCode: '000',
      payoutAccountNumber: '0001112223',
      payoutAccountName: 'Simulation Trader',
      userId,
      accountId: account.id,
      metadata: {
        withdrawal_schedule: objectives.withdrawalSchedule,
        mt5_account_number: account.accountNumber,
        currency: account.currency,
      },
    },
  })

  const completedAt = new Date()
  await prisma.payout.update({
    where: { id: payout.id },
    data: {
      status: 'completed',
      approvedAt: completedAt,
      completedAt,
      approvedBy: 'simulation',
    },
  })

  await prisma.cTraderAccount.update({
    where: { id: account.id },
    data: { status: 'withdrawn' },
  })

  return { payout, profitSplitAmount }
}

const simulateFlow = async (config: FlowConfig) => {
  const user = await ensureTestUser(config.label)
  const readyCount = Math.max(3, config.phases.length + 2)
  await createReadyAccounts({
    count: readyCount,
    accountSize: config.accountSize,
    currency: config.currency,
    challengeType: config.challengeType,
    label: config.label,
  })

  let previousAccount: { id: number; challengeId: string; accountNumber: string } | null = null
  let fundedAccount: { id: number; challengeId: string; accountNumber: string } | null = null

  for (const phase of config.phases) {
    const assigned = await assignReadyAccountFromPool({
      userId: user.id,
      challengeType: config.challengeType,
      phase,
      accountSize: config.accountSize,
      currency: config.currency,
      ...(previousAccount ? { baseChallengeId: normalizeChallengeBase(previousAccount.challengeId) } : {}),
    })

    if (!assigned) {
      throw new Error(`No ready account for ${config.label} ${phase}`)
    }

    if (previousAccount) {
      await prisma.cTraderAccount.update({ where: { id: previousAccount.id }, data: { status: 'completed' } })
    }

    await activateAccount(assigned.id)
    await passAccountPhase(assigned.id, phase)

    previousAccount = {
      id: assigned.id,
      challengeId: assigned.challengeId,
      accountNumber: assigned.accountNumber,
    }

    if (phase === 'funded') {
      fundedAccount = previousAccount
    }
  }

  if (!fundedAccount) {
    throw new Error(`No funded account created for ${config.label}`)
  }

  const { payout, profitSplitAmount } = await simulatePayout(user.id, fundedAccount.id)

  const replacementFunded = await assignReadyAccountFromPool({
    userId: user.id,
    challengeType: config.challengeType,
    phase: 'funded',
    accountSize: config.accountSize,
    currency: config.currency,
  })

  return {
    label: config.label,
    user: { id: user.id, email: user.email },
    funded_account: fundedAccount,
    payout: { id: payout.id, amount: profitSplitAmount },
    replacement_funded: replacementFunded
      ? { id: replacementFunded.id, accountNumber: replacementFunded.accountNumber }
      : null,
  }
}

const run = async () => {
  console.log('🌱 Seeding simulation flow...')

  await cleanupPreviousSimulationAccounts()

  const flows: FlowConfig[] = [
    {
      label: 'one_step',
      challengeType: 'one_step',
      currency: 'USD',
      accountSize: '$11,111',
      phases: ['phase_1', 'funded'],
    },
    {
      label: 'instant_funded',
      challengeType: 'instant_funded',
      currency: 'USD',
      accountSize: '$22,222',
      phases: ['funded'],
    },
    {
      label: 'ngn_standard',
      challengeType: 'ngn_standard',
      currency: 'NGN',
      accountSize: '₦3,333,333',
      phases: ['phase_1', 'phase_2', 'funded'],
    },
    {
      label: 'ngn_flexi',
      challengeType: 'ngn_flexi',
      currency: 'NGN',
      accountSize: '₦4,444,444',
      phases: ['phase_1', 'phase_2', 'funded'],
    },
  ]

  const results = []
  for (const flow of flows) {
    const result = await simulateFlow(flow)
    results.push(result)
  }

  console.log('✅ Simulation complete')
  console.log(results)
}

run()
  .catch((error) => {
    console.error('Simulation failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })