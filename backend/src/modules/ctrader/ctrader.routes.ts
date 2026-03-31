import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../../config/env'
import { upsertCTraderMetrics } from './ctrader.metrics'
import { listActiveCTraderAccounts } from './ctrader.active'

export const ctraderRouter = Router()

const metricsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.rateLimitMetricsMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const secret = String(req.header('X-ENGINE-SECRET') ?? '')
    return Boolean(secret && env.ctraderEngineSecret && secret === env.ctraderEngineSecret)
  },
})

ctraderRouter.get('/active-accounts', listActiveCTraderAccounts)
ctraderRouter.post('/metrics', metricsLimiter, upsertCTraderMetrics)