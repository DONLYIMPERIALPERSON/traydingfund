import { Router } from 'express'
import { traderRouter } from '../modules/trader/trader.routes'
import { adminRouter } from '../modules/admin/admin.routes'

export const router = Router()

router.get('/v1/status', (_req, res) => {
  res.json({ status: 'ok', version: 'v1' })
})

router.use('/v1/trader', traderRouter)
router.use('/v1/admin', adminRouter)