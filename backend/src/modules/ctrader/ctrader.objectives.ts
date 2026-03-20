import { getTradingObjectivesConfig } from '../tradingObjectives/tradingObjectives.service'
import type { TradingObjectivePhase } from '../tradingObjectives/tradingObjectives.config'

export type ObjectiveRuleSet = {
  maxDdPercent: number | null
  dailyDdPercent: number | null
  profitTargetPercent: number | null
  minTradingDaysRequired: number | null
  minTradeDurationMinutes: number | null
  profitSplitPercent: number | null
  withdrawalSchedule: string | null
}

const parsePercent = (value?: string | null) => {
  if (!value) return null
  const match = value.match(/([0-9]+(?:\.[0-9]+)?)/)
  return match ? Number(match[1]) : null
}

const parseNumber = (value?: string | null) => {
  if (!value) return null
  const match = value.match(/([0-9]+(?:\.[0-9]+)?)/)
  return match ? Number(match[1]) : null
}

const parseMinutes = (value?: string | null) => {
  if (!value) return null
  const match = value.match(/([0-9]+(?:\.[0-9]+)?)\s*(min|mins|minutes)?/i)
  return match ? Number(match[1]) : null
}

export const parseAccountSize = (accountSize: string) => {
  if (!accountSize) return null
  const normalized = accountSize.trim().toLowerCase()
  const match = normalized.match(/([0-9,.]+)\s*([km])?/i)
  if (!match || !match[1]) return null
  const rawNumber = match[1].replace(/,/g, '')
  const base = Number(rawNumber)
  if (!Number.isFinite(base)) return null
  const unit = match[2]
  if (unit === 'k') return base * 1000
  if (unit === 'm') return base * 1_000_000
  return base
}

const getRuleValue = (phase: TradingObjectivePhase, key: string) =>
  phase.rules.find((rule) => rule.key === key)?.value ?? null

export const getObjectiveRules = async (challengeType: string, phase: string): Promise<ObjectiveRuleSet> => {
  const config = await getTradingObjectivesConfig()
  const challenge = config.rules.challenge_types.find((item) => item.key === challengeType)
  if (!challenge) {
    throw new Error(`Unknown challenge type: ${challengeType}`)
  }
  const phaseConfig = challenge.phases.find((item) => item.key === phase)
  if (!phaseConfig) {
    throw new Error(`Unknown phase: ${phase}`)
  }

  return {
    maxDdPercent: parsePercent(getRuleValue(phaseConfig, 'max_drawdown')),
    dailyDdPercent: parsePercent(getRuleValue(phaseConfig, 'max_daily_drawdown')),
    profitTargetPercent: parsePercent(getRuleValue(phaseConfig, 'profit_target')),
    minTradingDaysRequired: parseNumber(getRuleValue(phaseConfig, 'min_trading_days')),
    minTradeDurationMinutes: parseMinutes(getRuleValue(phaseConfig, 'min_trade_duration')),
    profitSplitPercent: parsePercent(getRuleValue(phaseConfig, 'profit_split')),
    withdrawalSchedule: getRuleValue(phaseConfig, 'withdrawals') ?? null,
  }
}

export const buildObjectiveFields = async ({
  accountSize,
  challengeType,
  phase,
}: {
  accountSize: string
  challengeType: string
  phase: string
}) => {
  const rules = await getObjectiveRules(challengeType, phase)
  const initialBalance = parseAccountSize(accountSize)
  const maxDdAmount = initialBalance && rules.maxDdPercent !== null
    ? (initialBalance * rules.maxDdPercent) / 100
    : null
  const dailyDdAmount = initialBalance && rules.dailyDdPercent !== null
    ? (initialBalance * rules.dailyDdPercent) / 100
    : null
  const profitTargetAmount = initialBalance && rules.profitTargetPercent !== null
    ? (initialBalance * rules.profitTargetPercent) / 100
    : null

  return {
    initialBalance,
    maxDdPercent: rules.maxDdPercent,
    maxDdAmount,
    dailyDdPercent: rules.dailyDdPercent,
    dailyDdAmount,
    profitTargetPercent: rules.profitTargetPercent,
    profitTargetAmount,
    minTradingDaysRequired: rules.minTradingDaysRequired,
    minTradeDurationMinutes: rules.minTradeDurationMinutes,
    profitSplitPercent: rules.profitSplitPercent,
    withdrawalSchedule: rules.withdrawalSchedule,
  }
}