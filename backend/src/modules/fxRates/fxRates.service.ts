import { prisma } from '../../config/prisma'
import { DEFAULT_FX_RATES, type FxRateConfig } from './fxRates.config'

const CONFIG_KEY = 'fx_rates'

export const getFxRatesConfig = async () => {
  const existing = await prisma.tradingObjectiveConfig.findUnique({
    where: { key: CONFIG_KEY },
  })

  if (existing) {
    return {
      id: existing.id,
      key: existing.key,
      label: existing.label,
      rules: existing.rules as FxRateConfig,
      updated_at: existing.updatedAt,
    }
  }

  const created = await prisma.tradingObjectiveConfig.create({
    data: {
      key: CONFIG_KEY,
      label: 'FX Rates',
      rules: DEFAULT_FX_RATES,
    },
  })

  return {
    id: created.id,
    key: created.key,
    label: created.label,
    rules: created.rules as FxRateConfig,
    updated_at: created.updatedAt,
  }
}

export const updateFxRatesConfig = async (payload: FxRateConfig) => {
  const updated = await prisma.tradingObjectiveConfig.upsert({
    where: { key: CONFIG_KEY },
    create: {
      key: CONFIG_KEY,
      label: 'FX Rates',
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
    rules: updated.rules as FxRateConfig,
    updated_at: updated.updatedAt,
  }
}