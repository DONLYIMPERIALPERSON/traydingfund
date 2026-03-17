import { Router } from 'express'
import { traderRouter } from '../modules/trader/trader.routes'
import { adminRouter } from '../modules/admin/admin.routes'
import { authRouter } from '../modules/auth/auth.routes'
import { tradingObjectivesRouter } from '../modules/tradingObjectives/tradingObjectives.routes'
import { fxRatesRouter } from '../modules/fxRates/fxRates.routes'

export const router = Router()

router.get('/v1/status', (_req, res) => {
  res.json({ status: 'ok', version: 'v1' })
})

router.use('/v1/auth', authRouter)
router.use('/v1/trader', traderRouter)
router.use('/v1/admin', adminRouter)
router.use('/v1/trading-objectives', tradingObjectivesRouter)
router.use('/v1/admin/fx-rates', fxRatesRouter)