import { Request, Response, NextFunction } from 'express'
import {
  applyCouponToOrder,
  createAdminCoupon,
  listAdminCoupons,
  listPublicCoupons,
  previewCoupon,
  setAdminCouponStatus,
  toggleAdminCouponPlan,
} from '../../services/coupon.service'
import { ApiError } from '../../common/errors'
import { Coupon } from '@prisma/client'

type AuthRequest = Request & { user?: { id: number; email: string } }

const ensureUser = (req: AuthRequest) => {
  const user = req.user
  if (!user) {
    throw new ApiError('Unauthorized', 401)
  }
  return user
}

const serializeCoupon = (coupon: Coupon) => ({
  id: coupon.id,
  code: coupon.code,
  discount_type: coupon.discountType,
  discount_value: coupon.discountValue,
  is_active: coupon.isActive,
  expires_at: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
  max_uses: coupon.maxUses,
  used_count: coupon.usedCount,
  applicable_plan_ids: coupon.applicablePlanIds,
  applies_to_all_plans: coupon.appliesToAllPlans,
  status: coupon.isActive ? 'Active' : 'Inactive',
})

export const previewCheckoutCoupon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    ensureUser(req)
    const { code, plan_id, amount_kobo } = req.body as { code?: string; plan_id?: string; amount_kobo?: number }
    if (!code || !plan_id || !amount_kobo) {
      throw new ApiError('code, plan_id, and amount_kobo are required', 400)
    }

    const preview = await previewCoupon({
      code,
      planId: plan_id,
      amountKobo: amount_kobo,
    })

    res.json({
      code: preview.code,
      plan_id: plan_id,
      original_amount: preview.originalAmountKobo / 100,
      discount_amount: preview.discountAmountKobo / 100,
      final_amount: preview.finalAmountKobo / 100,
      formatted_original_amount: `$${(preview.originalAmountKobo / 100).toLocaleString('en-US')}`,
      formatted_discount_amount: `$${(preview.discountAmountKobo / 100).toLocaleString('en-US')}`,
      formatted_final_amount: `$${(preview.finalAmountKobo / 100).toLocaleString('en-US')}`,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listPublicActiveCoupons = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await listPublicCoupons()
    res.json({ coupons: coupons.map(serializeCoupon) })
  } catch (err) {
    next(err as Error)
  }
}

export const listCouponsAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await listAdminCoupons()
    res.json({ coupons: coupons.map(serializeCoupon) })
  } catch (err) {
    next(err as Error)
  }
}

export const createCouponAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, discount_type, discount_value, max_uses, expires_at, apply_all_plans, applicable_plan_ids } = req.body as {
      code?: string
      discount_type?: 'percent' | 'fixed'
      discount_value?: number
      max_uses?: number | null
      expires_at?: string | null
      apply_all_plans?: boolean
      applicable_plan_ids?: string[]
    }

    if (!code || !discount_type || !discount_value || apply_all_plans === undefined) {
      throw new ApiError('code, discount_type, discount_value, and apply_all_plans are required', 400)
    }

    const coupon = await createAdminCoupon({
      code,
      discountType: discount_type,
      discountValue: discount_value,
      maxUses: max_uses ?? null,
      expiresAt: expires_at ?? null,
      applyAllPlans: apply_all_plans,
      applicablePlanIds: applicable_plan_ids ?? [],
    })

    res.json(serializeCoupon(coupon))
  } catch (err) {
    next(err as Error)
  }
}

export const updateCouponStatusAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const couponId = Number(req.params.id)
    const { is_active } = req.body as { is_active?: boolean }

    if (!couponId || is_active === undefined) {
      throw new ApiError('coupon id and is_active are required', 400)
    }

    const coupon = await setAdminCouponStatus(couponId, is_active)
    res.json(serializeCoupon(coupon))
  } catch (err) {
    next(err as Error)
  }
}

export const updateCouponPlanAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const couponId = Number(req.params.id)
    const { plan_id, enabled } = req.body as { plan_id?: string; enabled?: boolean }
    if (!couponId || !plan_id || enabled === undefined) {
      throw new ApiError('coupon id, plan_id, and enabled are required', 400)
    }

    const coupon = await toggleAdminCouponPlan(couponId, { planId: plan_id, enabled })
    res.json(serializeCoupon(coupon))
  } catch (err) {
    next(err as Error)
  }
}

export const applyCouponForOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { code, plan_id, amount_kobo } = req.body as { code?: string; plan_id?: string; amount_kobo?: number }
    if (!code || !plan_id || !amount_kobo) {
      throw new ApiError('code, plan_id, and amount_kobo are required', 400)
    }

    const applied = await applyCouponToOrder({
      code,
      planId: plan_id,
      amountKobo: amount_kobo,
      userId: user.id,
    })

    res.json(applied)
  } catch (err) {
    next(err as Error)
  }
}