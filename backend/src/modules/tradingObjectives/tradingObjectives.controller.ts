import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../../common/errors'
import {
  getTradingObjectivesConfig,
  updateTradingObjectivesConfig,
} from './tradingObjectives.service'
import type { TradingObjectivesConfig } from './tradingObjectives.config'

export const getTradingObjectives = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await getTradingObjectivesConfig()
    res.json(config)
  } catch (err) {
    next(err as Error)
  }
}

export const updateTradingObjectives = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body?.rules as TradingObjectivesConfig | undefined
    if (!payload || !Array.isArray(payload.challenge_types)) {
      throw new ApiError('Invalid trading objectives payload', 400)
    }

    const updated = await updateTradingObjectivesConfig(payload)
    res.json(updated)
  } catch (err) {
    next(err as Error)
  }
}