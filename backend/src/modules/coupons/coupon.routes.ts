import { Router } from 'express'
import {
  applyCouponForOrder,
  createCouponAdmin,
  deleteCouponAdmin,
  listCouponsAdmin,
  listPublicActiveCoupons,
  previewCheckoutCoupon,
  updateCouponChallengeTypeAdmin,
  updateCouponPlanAdmin,
  updateCouponStatusAdmin,
} from './coupon.controller'
import { authenticate, requireRole } from '../../common/auth'

export const couponRouter = Router()

couponRouter.get('/public', listPublicActiveCoupons)

couponRouter.post('/preview', authenticate, requireRole('trader'), previewCheckoutCoupon)
couponRouter.post('/apply', authenticate, requireRole('trader'), applyCouponForOrder)

couponRouter.get('/admin', authenticate, requireRole(['admin', 'super_admin']), listCouponsAdmin)
couponRouter.post('/admin', authenticate, requireRole(['admin', 'super_admin']), createCouponAdmin)
couponRouter.patch('/admin/:id/status', authenticate, requireRole(['admin', 'super_admin']), updateCouponStatusAdmin)
couponRouter.patch('/admin/:id/plans', authenticate, requireRole(['admin', 'super_admin']), updateCouponPlanAdmin)
couponRouter.patch('/admin/:id/challenge-types', authenticate, requireRole(['admin', 'super_admin']), updateCouponChallengeTypeAdmin)
couponRouter.delete('/admin/:id', authenticate, requireRole(['admin', 'super_admin']), deleteCouponAdmin)