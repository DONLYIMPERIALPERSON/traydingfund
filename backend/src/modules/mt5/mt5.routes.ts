import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../../config/env'
import { upsertCTraderMetrics } from '../ctrader/ctrader.metrics'
import { listActiveCTraderAccounts } from '../ctrader/ctrader.active'

export const mt5Router = Router()

const metricsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.rateLimitMetricsMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const secret = String(req.header('X-ENGINE-SECRET') ?? '')
    return Boolean(secret && env.mt5EngineSecret && secret === env.mt5EngineSecret)
  },
})

mt5Router.get('/active-accounts', listActiveCTraderAccounts)
mt5Router.post('/metrics', metricsLimiter, upsertCTraderMetrics)