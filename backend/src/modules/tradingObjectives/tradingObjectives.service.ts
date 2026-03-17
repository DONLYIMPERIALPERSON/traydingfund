import { prisma } from '../../config/prisma'
import { DEFAULT_TRADING_OBJECTIVES, type TradingObjectivesConfig } from './tradingObjectives.config'

const CONFIG_KEY = 'trading_objectives'

export const getTradingObjectivesConfig = async () => {
  const existing = await prisma.tradingObjectiveConfig.findUnique({
    where: { key: CONFIG_KEY },
  })

  if (existing) {
    return {
      id: existing.id,
      key: existing.key,
      label: existing.label,
      rules: existing.rules as TradingObjectivesConfig,
      updated_at: existing.updatedAt,
    }
  }

  const created = await prisma.tradingObjectiveConfig.create({
    data: {
      key: CONFIG_KEY,
      label: 'Trading Objectives',
      rules: DEFAULT_TRADING_OBJECTIVES,
    },
  })

  return {
    id: created.id,
    key: created.key,
    label: created.label,
    rules: created.rules as TradingObjectivesConfig,
    updated_at: created.updatedAt,
  }
}

export const updateTradingObjectivesConfig = async (payload: TradingObjectivesConfig) => {
  const updated = await prisma.tradingObjectiveConfig.upsert({
    where: { key: CONFIG_KEY },
    create: {
      key: CONFIG_KEY,
      label: 'Trading Objectives',
      rules: payload,
    },
    update: {
      rules: payload,
    },
  })

  return {
    id: updated.id,
    key: updated.key,
    label: updated.label,
    rules: updated.rules as TradingObjectivesConfig,
    updated_at: updated.updatedAt,
  }
}