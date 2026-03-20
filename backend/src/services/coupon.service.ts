import { prisma } from '../config/prisma'
import { ApiError } from '../common/errors'

export type CouponPreview = {
  couponId: number
  code: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  originalAmountKobo: number
  discountAmountKobo: number
  finalAmountKobo: number
}

const toUpper = (value: string) => value.trim().toUpperCase()

const isExpired = (expiresAt: Date | null, now = new Date()) =>
  Boolean(expiresAt && expiresAt.getTime() < now.getTime())

const validatePlan = (planId: string, coupon: { appliesToAllPlans: boolean; applicablePlanIds: string[] }) => {
  if (coupon.appliesToAllPlans) return true
  return coupon.applicablePlanIds.includes(planId)
}

export const previewCoupon = async (payload: { code: string; planId: string; amountKobo: number }) => {
  const code = toUpper(payload.code)
  const coupon = await prisma.coupon.findUnique({ where: { code } })
  if (!coupon || !coupon.isActive) {
    throw new ApiError('Coupon is invalid or inactive', 400)
  }

  if (isExpired(coupon.expiresAt ?? null)) {
    throw new ApiError('Coupon has expired', 400)
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new ApiError('Coupon usage limit reached', 400)
  }

  if (!validatePlan(payload.planId, coupon)) {
    throw new ApiError('Coupon is not valid for this account size', 400)
  }

  const originalAmountKobo = payload.amountKobo
  const rawDiscount = coupon.discountType === 'percent'
    ? Math.round(originalAmountKobo * (coupon.discountValue / 100))
    : Math.round(coupon.discountValue * 100)

  const discountAmountKobo = Math.min(rawDiscount, originalAmountKobo)
  const finalAmountKobo = Math.max(0, originalAmountKobo - discountAmountKobo)

  return {
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType as 'percent' | 'fixed',
    discountValue: coupon.discountValue,
    originalAmountKobo,
    discountAmountKobo,
    finalAmountKobo,
  }
}

export const applyCouponToOrder = async (payload: {
  code?: string | null
  planId: string
  amountKobo: number
  userId: number
}) => {
  if (!payload.code) {
    return {
      couponCode: null,
      couponId: null,
      discountAmountKobo: 0,
      finalAmountKobo: payload.amountKobo,
    }
  }

  const preview = await previewCoupon({
    code: payload.code,
    planId: payload.planId,
    amountKobo: payload.amountKobo,
  })

  await prisma.$transaction(async (tx) => {
    await tx.coupon.update({
      where: { id: preview.couponId },
      data: { usedCount: { increment: 1 } },
    })

    await tx.couponRedemption.create({
      data: {
        couponId: preview.couponId,
        userId: payload.userId,
      },
    })
  })

  return {
    couponCode: preview.code,
    couponId: preview.couponId,
    discountAmountKobo: preview.discountAmountKobo,
    finalAmountKobo: preview.finalAmountKobo,
  }
}

export const listAdminCoupons = async () => prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })

export const createAdminCoupon = async (payload: {
  code: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  maxUses?: number | null
  expiresAt?: string | null
  applyAllPlans: boolean
  applicablePlanIds: string[]
}) => {
  const code = toUpper(payload.code)
  return prisma.coupon.create({
    data: {
      code,
      discountType: payload.discountType,
      discountValue: payload.discountValue,
      maxUses: payload.maxUses ?? null,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      appliesToAllPlans: payload.applyAllPlans,
      applicablePlanIds: payload.applyAllPlans ? [] : payload.applicablePlanIds,
    },
  })
}

export const setAdminCouponStatus = async (couponId: number, isActive: boolean) =>
  prisma.coupon.update({
    where: { id: couponId },
    data: { isActive },
  })

export const toggleAdminCouponPlan = async (couponId: number, payload: { planId: string; enabled: boolean }) => {
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } })
  if (!coupon) {
    throw new ApiError('Coupon not found', 404)
  }

  if (coupon.appliesToAllPlans) {
    return coupon
  }

  const nextPlanIds = payload.enabled
    ? Array.from(new Set([...coupon.applicablePlanIds, payload.planId]))
    : coupon.applicablePlanIds.filter((id) => id !== payload.planId)

  return prisma.coupon.update({
    where: { id: couponId },
    data: { applicablePlanIds: nextPlanIds },
  })
}

export const listPublicCoupons = async () => {
  const now = new Date()
  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })
  return coupons.filter((coupon) => coupon.maxUses === null || coupon.usedCount < coupon.maxUses)
}