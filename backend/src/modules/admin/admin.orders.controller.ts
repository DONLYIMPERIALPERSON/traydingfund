import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { assignReadyAccountFromPool, buildBaseChallengeId, resolveChallengeCurrency } from '../ctrader/ctrader.assignment'
import { buildObjectiveFields } from '../ctrader/ctrader.objectives'
import { requestAccountAccess } from '../../services/accessEngine.service'
import { createOnboardingCertificate } from '../../services/certificate.service'
import { getFxRatesConfig } from '../fxRates/fxRates.service'
import { fetchRemoteAttachment, sendUnifiedEmail } from '../../services/email.service'
import { redeemCouponForCompletedOrder } from '../../services/coupon.service'

const AFFILIATE_COMMISSION_PERCENT = 30
const BREEZY_SUBSCRIPTION_DAYS = 7
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
const isBreezyChallengeType = (challengeType?: string | null) => String(challengeType ?? '').toLowerCase() === 'breezy'

const formatCurrency = (amountKobo: number) =>
  `$${(amountKobo / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const buildEmailSubject = (base: string) => {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `${base} #${suffix}`
}

const normalizePoolAccountSizeDigits = (value: string) => value.replace(/\D/g, '')

const countMatchingReadyAccounts = async (params: {
  accountSize: string
  challengeType?: string | null
  currency?: string | null
  platform?: string | null
}) => {
  const resolvedCurrency = resolveChallengeCurrency(params.challengeType, params.currency ?? null)
  const resolvedPlatform = String(params.platform ?? 'ctrader').toLowerCase()
  const normalizedDigits = normalizePoolAccountSizeDigits(params.accountSize)

  const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "CTraderAccount"
    WHERE lower(status) = 'ready'
      AND "userId" IS NULL
      AND lower("currency") = lower(${resolvedCurrency})
      AND lower("platform") = lower(${resolvedPlatform})
      AND regexp_replace(lower("accountSize"), '[^0-9]', '', 'g') = ${normalizedDigits}
      AND (
        lower(${resolvedPlatform}) <> 'mt5'
        OR (
          "mt5Server" IS NOT NULL
          AND "mt5Password" IS NOT NULL
        )
      )
  `

  return Number(rows[0]?.count ?? 0)
}

const toUsdKobo = (amountKobo: number, currency?: string | null, rate?: number) => {
  if (currency?.toUpperCase() === 'NGN') {
    const divider = rate && rate > 0 ? rate : 1300
    const amount = amountKobo / 100
    return Math.round((amount / divider) * 100)
  }
  return amountKobo
}

const createAffiliateCommission = async (order: { id: number; affiliateId?: number | null; netAmountKobo: number; currency?: string | null }) => {
  const affiliateId = order.affiliateId ?? null
  if (!affiliateId) return

  const existing = await prisma.affiliateCommission.findFirst({
    where: { orderId: order.id },
  })
  if (existing) return

  const fxConfig = await getFxRatesConfig()
  const usdNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
  const commissionBaseKobo = toUsdKobo(order.netAmountKobo, order.currency, usdNgnRate)
  const commissionAmount = Math.round(commissionBaseKobo * (AFFILIATE_COMMISSION_PERCENT / 100))
  await prisma.affiliateCommission.create({
    data: {
      orderId: order.id,
      affiliateId,
      amountKobo: commissionAmount,
      status: 'earned',
    },
  })
}

export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fxConfig = await getFxRatesConfig()
    const usdNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
    type OrderWithUser = Prisma.OrderGetPayload<{ include: { user: true } }>
    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 10)
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const period = typeof req.query.period === 'string' ? req.query.period : undefined
    const searchEmail = typeof req.query.searchEmail === 'string' ? req.query.searchEmail : undefined

    const now = new Date()
    let startDate: Date | undefined
    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 7)
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const where: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(startDate ? { createdAt: { gte: startDate } } : {}),
      ...(searchEmail ? { user: { is: { email: { contains: searchEmail, mode: 'insensitive' } } } } : {}),
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }) as Promise<OrderWithUser[]>,
      prisma.order.count({ where }),
    ])

    const pages = Math.max(1, Math.ceil(total / limit))

    res.json({
      orders: orders.map((order) => ({
        id: order.id,
        provider_order_id: order.providerOrderId,
        status: order.status,
        assignment_status: order.assignmentStatus,
        account_size: order.accountSize,
        currency: order.currency,
        net_amount_formatted: formatCurrency(toUsdKobo(order.netAmountKobo, order.currency, usdNgnRate)),
        created_at: order.createdAt,
        paid_at: order.paidAt,
        payment_method: order.paymentMethod,
        payment_provider: order.paymentProvider,
        crypto_currency: order.cryptoCurrency,
        crypto_address: order.cryptoAddress,
        user: { id: order.userId, name: order.user.fullName ?? 'Trader', email: order.user.email },
      })),
      pagination: { page, limit, total, pages },
    })
  } catch (err) {
    next(err as Error)
  }
}

export const getOrderStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fxConfig = await getFxRatesConfig()
    const usdNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
    const period = typeof req.query.period === 'string' ? req.query.period : 'today'
    const now = new Date()
    let startDate: Date | undefined

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 7)
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const where: Prisma.OrderWhereInput = startDate ? { createdAt: { gte: startDate } } : {}

    const completedWhere: Prisma.OrderWhereInput = { ...where, status: 'completed' }
    const [totalOrders, paidOrders, pendingOrders, failedOrders, usdVolume, ngnVolume] = await Promise.all([
      prisma.order.count({ where: completedWhere }),
      prisma.order.count({ where: completedWhere }),
      prisma.order.count({ where: { ...where, status: 'pending' } }),
      prisma.order.count({ where: { ...where, status: { in: ['failed', 'expired'] } } }),
      prisma.order.aggregate({ _sum: { netAmountKobo: true }, where: { ...completedWhere, currency: 'USD' } }),
      prisma.order.aggregate({ _sum: { netAmountKobo: true }, where: { ...completedWhere, currency: 'NGN' } }),
    ])

    const totalVolumeKobo = (usdVolume._sum.netAmountKobo ?? 0)
      + toUsdKobo(ngnVolume._sum.netAmountKobo ?? 0, 'NGN', usdNgnRate)
    const successRate = totalOrders === 0 ? 0 : (paidOrders / (totalOrders + pendingOrders + failedOrders)) * 100

    res.json({
      period,
      total_orders: totalOrders,
      paid_orders: paidOrders,
      pending_orders: pendingOrders,
      failed_orders: failedOrders,
      total_volume_formatted: formatCurrency(totalVolumeKobo),
      success_rate_formatted: `${successRate.toFixed(1)}%`,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listPendingAssignments = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const fxConfig = await getFxRatesConfig()
    const usdNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
    type OrderWithUser = Prisma.OrderGetPayload<{ include: { user: true } }>
    const orders = await prisma.order.findMany({
      where: { assignmentStatus: 'pending_assign', status: { in: ['pending', 'completed'] } },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    }) as OrderWithUser[]

    const ordersWithAvailability = await Promise.all(orders.map(async (order) => {
      const platform = (order.metadata as { platform?: string } | null)?.platform ?? 'ctrader'
      const readyMatches = await countMatchingReadyAccounts({
        accountSize: order.accountSize,
        challengeType: order.challengeType,
        currency: order.currency,
        platform,
      })

      return {
        id: order.id,
        provider_order_id: order.providerOrderId,
        status: order.status,
        assignment_status: order.assignmentStatus,
        account_size: order.accountSize,
        currency: order.currency,
        challenge_type: order.challengeType,
        phase: order.phase,
        platform,
        ready_matches: readyMatches,
        net_amount_formatted: formatCurrency(toUsdKobo(order.netAmountKobo, order.currency, usdNgnRate)),
        created_at: order.createdAt,
        paid_at: order.paidAt,
        payment_method: order.paymentMethod,
        payment_provider: order.paymentProvider,
        crypto_currency: order.cryptoCurrency,
        crypto_address: order.cryptoAddress,
        user: { id: order.userId, name: order.user.fullName ?? 'Trader', email: order.user.email },
      }
    }))

    res.json({ orders: ordersWithAvailability })
  } catch (err) {
    next(err as Error)
  }
}

export const retryPendingAssignments = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pendingOrders = await prisma.order.findMany({
      where: { assignmentStatus: 'pending_assign', status: { in: ['pending', 'completed'] } },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    })

    let assignedCount = 0
    const skipped: Array<{ orderId: number; providerOrderId: string | null; reason: string }> = []

    for (const order of pendingOrders) {
      const platform = (order.metadata as { platform?: string } | null)?.platform ?? 'ctrader'
      const readyMatchesBeforeAssign = await countMatchingReadyAccounts({
        accountSize: order.accountSize,
        challengeType: order.challengeType,
        currency: order.currency,
        platform,
      })
      const resolvedCurrency = resolveChallengeCurrency(order.challengeType, order.currency ?? null)

      const assigned = await assignReadyAccountFromPool({
        userId: order.userId,
        challengeType: order.challengeType ?? 'two_step',
        phase: order.phase ?? 'phase_1',
        accountSize: order.accountSize,
        currency: resolvedCurrency,
        platform,
        baseChallengeId: buildBaseChallengeId(order.id),
      })

      if (!assigned) {
        skipped.push({
          orderId: order.id,
          providerOrderId: order.providerOrderId,
          reason: readyMatchesBeforeAssign > 0 ? 'ready_available_but_assignment_failed' : 'no_ready_account_matched',
        })
        continue
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { assignmentStatus: 'assigned' },
      })

      if (isBreezyChallengeType(order.challengeType)) {
        const paidAt = order.paidAt ?? new Date()
        await prisma.cTraderAccount.update({
          where: { id: assigned.id },
          data: {
            subscriptionStartedAt: paidAt,
            subscriptionExpiresAt: addDays(paidAt, BREEZY_SUBSCRIPTION_DAYS),
            subscriptionStatus: 'active',
            renewalPriceKobo: order.netAmountKobo,
          } as Prisma.CTraderAccountUncheckedUpdateInput,
        })
      }

      if (platform.toLowerCase() === 'mt5') {
        await prisma.cTraderAccount.update({
          where: { id: assigned.id },
          data: { status: 'active', accessStatus: 'granted', accessGrantedAt: new Date() },
        })
      } else if (order.user?.email) {
        const accessAccountSize = assigned.accountSize ?? order.accountSize
        await requestAccountAccess({
          user_email: order.user.email,
          account_number: assigned.accountNumber,
          broker: assigned.brokerName,
          platform,
          ...(order.user.fullName ? { user_name: order.user.fullName } : {}),
          ...(order.challengeType ? { account_type: order.challengeType } : {}),
          ...(order.phase ? { account_phase: order.phase } : {}),
          ...(accessAccountSize ? { account_size: accessAccountSize } : {}),
          ...(assigned.mt5Login ? { mt5_login: assigned.mt5Login } : {}),
          ...(assigned.mt5Server ? { mt5_server: assigned.mt5Server } : {}),
          ...(assigned.mt5Password ? { mt5_password: assigned.mt5Password } : {}),
        })
      }

      assignedCount += 1
    }

    res.json({
      message: 'Pending assignments processed',
      total: pendingOrders.length,
      assigned: assignedCount,
      skipped,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const approveCryptoOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id)
    if (!orderId) {
      throw new ApiError('Invalid order id', 400)
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      throw new ApiError('Order not found', 404)
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'completed',
        paidAt: new Date(),
      },
    })

    await redeemCouponForCompletedOrder({
      couponId: (updated.metadata as { couponId?: number | null } | null)?.couponId ?? null,
      userId: updated.userId,
      orderId: updated.id,
    })

    let onboardingCertificateUrl: string | null = null
    let certificateAttachments: Array<{ filename: string; content: Buffer; contentType?: string }> | undefined
    try {
      const certificate = await createOnboardingCertificate({
        userId: updated.userId,
        orderId: updated.id,
        challengeType: updated.challengeType,
        phase: updated.phase,
        accountSize: updated.accountSize,
      })
      onboardingCertificateUrl = certificate.certificateUrl
      if (onboardingCertificateUrl) {
        certificateAttachments = [
          await fetchRemoteAttachment({
            url: onboardingCertificateUrl,
            filename: 'onboarding-certificate.png',
            contentType: 'image/png',
          }),
        ]
      }
    } catch (error) {
      console.error('Failed to create onboarding certificate', error)
    }

    await createAffiliateCommission({
      id: updated.id,
      ...(updated.affiliateId !== null && updated.affiliateId !== undefined ? { affiliateId: updated.affiliateId } : {}),
      netAmountKobo: updated.netAmountKobo,
      currency: updated.currency,
    })

    const challengeType = updated.challengeType ?? 'two_step'
    const phase = updated.phase ?? 'phase_1'
    const user = await prisma.user.findUnique({ where: { id: updated.userId } })

    if (user?.email) {
      try {
        const objectives = await buildObjectiveFields({
          accountSize: updated.accountSize,
          challengeType,
          phase,
        })
        const objectivesLines = [
          objectives.maxDdPercent != null ? `Max Drawdown: ${objectives.maxDdPercent}%` : null,
          objectives.dailyDdPercent != null ? `Daily Drawdown: ${objectives.dailyDdPercent}%` : null,
          objectives.profitTargetPercent != null ? `Profit Target: ${objectives.profitTargetPercent}%` : null,
          objectives.minTradingDaysRequired != null ? `Minimum Trading Days: ${objectives.minTradingDaysRequired}` : null,
          objectives.minTradeDurationMinutes != null ? `Min Trade Duration: ${objectives.minTradeDurationMinutes} mins` : null,
          objectives.profitSplitPercent != null ? `Profit Split: ${objectives.profitSplitPercent}%` : null,
          objectives.withdrawalSchedule ? `Withdrawal Schedule: ${objectives.withdrawalSchedule}` : null,
        ].filter(Boolean)

        await sendUnifiedEmail({
          to: user.email,
          subject: 'Your purchase receipt & trading objectives',
          title: 'Challenge Purchase Confirmed',
          subtitle: 'Your trading objectives are ready',
          content: `Thank you for your purchase! Your ${updated.accountSize} ${challengeType} challenge has been confirmed. Please review your receipt and objectives below.`,
          buttonText: 'View Dashboard',
          infoBox: [
            `Receipt: ${formatCurrency(updated.netAmountKobo)} (${updated.paymentMethod ?? 'payment'})`,
            `Order ID: ${updated.providerOrderId ?? updated.id}`,
            `Status: ${updated.status}`,
            `Objectives: ${objectivesLines.length ? objectivesLines.join(' | ') : 'Check your dashboard for objectives.'}`,
          ].join('<br>'),
          ...(certificateAttachments ? { attachments: certificateAttachments } : {}),
        })
      } catch (error) {
        console.error('Failed to send purchase email', error)
      }
    }

    if (updated.assignmentStatus !== 'assigned') {
      const platform = (updated.metadata as { platform?: string } | null)?.platform ?? 'ctrader'
      const assigned = await assignReadyAccountFromPool({
        userId: updated.userId,
        challengeType,
        phase,
        accountSize: updated.accountSize,
        currency: updated.currency ?? 'USD',
        platform,
        baseChallengeId: buildBaseChallengeId(updated.id),
      })

      if (assigned) {
        await prisma.order.update({
          where: { id: updated.id },
          data: { assignmentStatus: 'assigned' },
        })

        if (isBreezyChallengeType(updated.challengeType)) {
          const paidAt = updated.paidAt ?? new Date()
          await prisma.cTraderAccount.update({
            where: { id: assigned.id },
            data: {
              subscriptionStartedAt: paidAt,
              subscriptionExpiresAt: addDays(paidAt, BREEZY_SUBSCRIPTION_DAYS),
              subscriptionStatus: 'active',
              renewalPriceKobo: updated.netAmountKobo,
            } as Prisma.CTraderAccountUncheckedUpdateInput,
          })
        }

        if (platform.toLowerCase() === 'mt5') {
          await prisma.cTraderAccount.update({
            where: { id: assigned.id },
            data: { status: 'active', accessStatus: 'granted', accessGrantedAt: new Date() },
          })
        } else if (user?.email) {
          const accessAccountSize = assigned.accountSize ?? updated.accountSize
          await requestAccountAccess({
            user_email: user.email,
            account_number: assigned.accountNumber,
            broker: assigned.brokerName,
            platform,
            ...(user.fullName ? { user_name: user.fullName } : {}),
            ...(updated.challengeType ? { account_type: updated.challengeType } : {}),
            ...(updated.phase ? { account_phase: updated.phase } : {}),
            ...(accessAccountSize ? { account_size: accessAccountSize } : {}),
            ...(assigned.mt5Login ? { mt5_login: assigned.mt5Login } : {}),
            ...(assigned.mt5Server ? { mt5_server: assigned.mt5Server } : {}),
            ...(assigned.mt5Password ? { mt5_password: assigned.mt5Password } : {}),
          })
        }
      } else {
        await prisma.order.update({
          where: { id: updated.id },
          data: { assignmentStatus: 'pending_assign' },
        })
      }
    }

    res.json({
      id: updated.id,
      status: updated.status,
      message: 'Order approved',
    })
  } catch (err) {
    next(err as Error)
  }
}

export const declineCryptoOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id)
    if (!orderId) {
      throw new ApiError('Invalid order id', 400)
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      throw new ApiError('Order not found', 404)
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'failed' },
    })

    res.json({
      id: updated.id,
      status: updated.status,
      message: 'Order declined',
    })
  } catch (err) {
    next(err as Error)
  }
}