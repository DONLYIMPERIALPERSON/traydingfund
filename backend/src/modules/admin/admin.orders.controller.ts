import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { assignReadyAccountFromPool } from '../ctrader/ctrader.assignment'
import { buildObjectiveFields } from '../ctrader/ctrader.objectives'
import { requestAccountAccess } from '../../services/accessEngine.service'
import { createOnboardingCertificate } from '../../services/certificate.service'
import { fetchRemoteAttachment, sendUnifiedEmail } from '../../services/email.service'

const AFFILIATE_COMMISSION_PERCENT = 10

const formatCurrency = (amountKobo: number) =>
  `$${(amountKobo / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const createAffiliateCommission = async (order: { id: number; affiliateId?: number | null; netAmountKobo: number }) => {
  const affiliateId = order.affiliateId ?? null
  if (!affiliateId) return

  const existing = await prisma.affiliateCommission.findFirst({
    where: { orderId: order.id },
  })
  if (existing) return

  const commissionAmount = Math.round(order.netAmountKobo * (AFFILIATE_COMMISSION_PERCENT / 100))
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
        net_amount_formatted: `$${(order.netAmountKobo / 100).toLocaleString('en-US')}`,
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

    const [totalOrders, paidOrders, pendingOrders, failedOrders, volume] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: 'completed' } }),
      prisma.order.count({ where: { ...where, status: 'pending' } }),
      prisma.order.count({ where: { ...where, status: { in: ['failed', 'expired'] } } }),
      prisma.order.aggregate({ _sum: { netAmountKobo: true }, where }),
    ])

    const totalVolumeKobo = volume._sum.netAmountKobo ?? 0
    const successRate = totalOrders === 0 ? 0 : (paidOrders / totalOrders) * 100

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
    type OrderWithUser = Prisma.OrderGetPayload<{ include: { user: true } }>
    const orders = await prisma.order.findMany({
      where: { assignmentStatus: 'pending_assign', status: 'pending' },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    }) as OrderWithUser[]

    res.json({
      orders: orders.map((order) => ({
        id: order.id,
        provider_order_id: order.providerOrderId,
        status: order.status,
        assignment_status: order.assignmentStatus,
        account_size: order.accountSize,
        net_amount_formatted: `$${(order.netAmountKobo / 100).toLocaleString('en-US')}`,
        created_at: order.createdAt,
        paid_at: order.paidAt,
        payment_method: order.paymentMethod,
        payment_provider: order.paymentProvider,
        crypto_currency: order.cryptoCurrency,
        crypto_address: order.cryptoAddress,
        user: { id: order.userId, name: order.user.fullName ?? 'Trader', email: order.user.email },
      })),
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

    await createAffiliateCommission(updated as { id: number; affiliateId?: number | null; netAmountKobo: number })

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
          attachments: certificateAttachments,
        })
      } catch (error) {
        console.error('Failed to send purchase email', error)
      }
    }

    if (updated.assignmentStatus !== 'assigned') {
      const assigned = await assignReadyAccountFromPool({
        userId: updated.userId,
        challengeType,
        phase,
        accountSize: updated.accountSize,
      })

      if (assigned) {
        await prisma.order.update({
          where: { id: updated.id },
          data: { assignmentStatus: 'assigned' },
        })

        if (user?.email) {
          await requestAccountAccess({
            user_email: user.email,
            account_number: assigned.accountNumber,
            broker: assigned.brokerName,
            platform: 'ctrader',
          })
          try {
            await sendUnifiedEmail({
              to: user.email,
              subject: 'Your MACHEFUNDED account is ready',
              title: 'Account Approved',
              subtitle: 'Your challenge is now active',
              content: `Congratulations! Your ${updated.accountSize} ${updated.challengeType ?? 'challenge'} account is live. You can now log in and start trading.`,
              buttonText: 'Go to Dashboard',
              infoBox: `Account Size: ${updated.accountSize}<br>Challenge: ${updated.challengeType ?? 'Two-Step'}<br>Phase: ${updated.phase ?? 'Phase 1'}<br>Account Number: ${assigned.accountNumber}`,
              attachments: certificateAttachments,
            })
          } catch (error) {
            console.error('Failed to send onboarding email', error)
          }
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