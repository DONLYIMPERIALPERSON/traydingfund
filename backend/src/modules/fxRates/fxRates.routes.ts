import { Router } from 'express'
import { authenticate, requireRole } from '../../common/auth'
import { getFxRates, updateFxRates } from './fxRates.controller'

export const fxRatesRouter = Router()

fxRatesRouter.get('/', authenticate, requireRole(['admin', 'super_admin']), getFxRates)
fxRatesRouter.put('/', authenticate, requireRole(['super_admin']), updateFxRates)