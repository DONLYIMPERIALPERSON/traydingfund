import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../../common/errors'
import { getFxRatesConfig, updateFxRatesConfig } from './fxRates.service'
import type { FxRateConfig } from './fxRates.config'

export const getFxRates = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await getFxRatesConfig()
    res.json(config)
  } catch (err) {
    next(err as Error)
  }
}

export const updateFxRates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body?.rates as FxRateConfig | undefined
    if (!payload || typeof payload.usd_ngn_rate !== 'number') {
      throw new ApiError('Invalid FX rates payload', 400)
    }

    const updated = await updateFxRatesConfig(payload)
    res.json(updated)
  } catch (err) {
    next(err as Error)
  }
}