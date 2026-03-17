import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'

export const listOrders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    })

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
      pagination: { page: 1, limit: orders.length, total: orders.length, pages: 1 },
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