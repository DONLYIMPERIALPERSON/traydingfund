import { Router } from 'express'
import { upsertCTraderMetrics } from './ctrader.metrics'

export const ctraderRouter = Router()

ctraderRouter.post('/metrics', upsertCTraderMetrics)