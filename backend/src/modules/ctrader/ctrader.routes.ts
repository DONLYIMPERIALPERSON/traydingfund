import { Router } from 'express'
import { upsertCTraderMetrics } from './ctrader.metrics'
import { listActiveCTraderAccounts } from './ctrader.active'

export const ctraderRouter = Router()

ctraderRouter.get('/active-accounts', listActiveCTraderAccounts)
ctraderRouter.post('/metrics', upsertCTraderMetrics)