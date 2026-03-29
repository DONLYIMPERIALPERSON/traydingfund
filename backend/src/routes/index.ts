import { Router } from 'express'
import { traderRouter } from '../modules/trader/trader.routes'
import { adminRouter } from '../modules/admin/admin.routes'
import { authRouter } from '../modules/auth/auth.routes'
import { tradingObjectivesRouter } from '../modules/tradingObjectives/tradingObjectives.routes'
import { fxRatesRouter } from '../modules/fxRates/fxRates.routes'
import { ctraderRouter } from '../modules/ctrader/ctrader.routes'
import { kycRouter } from '../modules/kyc/kyc.routes'
import { payoutRouter } from '../modules/payouts/payouts.routes'
import { supportRouter } from '../modules/support/support.routes'
import { couponRouter } from '../modules/coupons/coupon.routes'
import { planRouter } from '../modules/plans/plan.routes'

export const router = Router()

router.get('/v1/status', (_req, res) => {
  res.json({ status: 'ok', version: 'v1' })
})

router.use('/v1/auth', authRouter)
router.use('/v1/trader', traderRouter)
router.use('/v1/admin', adminRouter)
router.use('/v1/trading-objectives', tradingObjectivesRouter)
router.use('/v1/admin/fx-rates', fxRatesRouter)
router.use('/v1/ctrader', ctraderRouter)
router.use('/v1/kyc', kycRouter)
router.use('/v1/payouts', payoutRouter)
router.use('/v1/coupons', couponRouter)
router.use('/v1/support', supportRouter)
router.use('/v1/public', planRouter)