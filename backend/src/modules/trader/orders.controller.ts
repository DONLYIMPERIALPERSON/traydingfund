import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { ApiError } from '../../common/errors'
import { createVirtualAccount } from '../../services/safehaven.service'
import { getFxRatesConfig } from '../fxRates/fxRates.service'

const CRYPTO_ADDRESSES = {
  BTC: env.cryptoBtcAddress,
  ETH: env.cryptoEthAddress,
  SOL: env.cryptoSolAddress,
  TRX: env.cryptoTrxAddress,
  USDT: '',
}

const resolveCryptoAddress = (currency: keyof typeof CRYPTO_ADDRESSES) => {
  if (currency === 'USDT') {
    return env.cryptoEthAddress || env.cryptoSolAddress || env.cryptoTrxAddress
  }
  return CRYPTO_ADDRESSES[currency]
}

type AuthRequest = Request & { user?: { id: number; email: string } }

const ensureUser = (req: AuthRequest) => {
  const user = req.user
  if (!user) {
    throw new ApiError('Unauthorized', 401)
  }
  return user
}

export const listOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      orders: orders.map((order) => ({
        id: order.id,
        provider_order_id: order.providerOrderId,
        status: order.status,
        assignment_status: order.assignmentStatus,
        account_size: order.accountSize,
        net_amount_kobo: order.netAmountKobo,
        net_amount_formatted: `$${(order.netAmountKobo / 100).toLocaleString('en-US')}`,
        payment_method: order.paymentMethod,
        payment_provider: order.paymentProvider,
        created_at: order.createdAt,
        paid_at: order.paidAt,
      })),
    })
  } catch (err) {
    next(err as Error)
  }
}

export const createBankTransferOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { plan_id, account_size, amount_kobo, coupon_code } = req.body as {
      plan_id?: string
      account_size?: string
      amount_kobo?: number
      coupon_code?: string | null
    }

    if (!plan_id || !account_size || !amount_kobo) {
      throw new ApiError('plan_id, account_size and amount_kobo are required', 400)
    }

    const providerOrderId = `MF-${Date.now()}-${Math.floor(Math.random() * 9999)}`

    const fxConfig = await getFxRatesConfig()
    const usdAmount = amount_kobo / 100
    const usdToNgnRate = fxConfig.rules?.usd_ngn_rate ?? 1300
    const ngnAmount = Math.round(usdAmount * usdToNgnRate)

    const virtualAccount = await createVirtualAccount({
      amount: ngnAmount,
      externalReference: providerOrderId,
    })

    const resolvedAccountNumber = virtualAccount.accountNumber
      ?? (virtualAccount as { account_number?: string }).account_number
      ?? ''
    const resolvedAccountName = virtualAccount.accountName
      ?? (virtualAccount as { account_name?: string }).account_name
      ?? ''
    const resolvedBankName = virtualAccount.bankName
      ?? (virtualAccount as { bank_name?: string }).bank_name
      ?? 'SafeHaven MFB'
    const resolvedBankCode = virtualAccount.bankCode
      ?? (virtualAccount as { bank_code?: string }).bank_code
      ?? ''
    const resolvedAmount = virtualAccount.amount ?? ngnAmount

    const order = await prisma.order.create({
      data: {
        providerOrderId,
        status: 'pending',
        assignmentStatus: 'unassigned',
        currency: 'USD',
        grossAmountKobo: amount_kobo,
        discountAmountKobo: 0,
        netAmountKobo: amount_kobo,
        planId: plan_id,
        accountSize: account_size,
        couponCode: coupon_code ?? null,
        checkoutUrl: null,
        paymentMethod: 'bank_transfer',
        paymentProvider: 'safehaven',
        safehavenAccountId: virtualAccount._id,
        safehavenAccountNumber: resolvedAccountNumber,
        safehavenAccountName: resolvedAccountName,
        safehavenBankName: resolvedBankName,
        safehavenExpiresAt: virtualAccount.expiryDate ? new Date(virtualAccount.expiryDate) : null,
        safehavenSessionId: virtualAccount.sessionId ?? null,
        metadata: {
          safehaven: virtualAccount,
        },
        userId: user.id,
      },
    })

    res.json({
      provider_order_id: order.providerOrderId,
      status: order.status,
      assignment_status: order.assignmentStatus,
      currency: order.currency,
      gross_amount_kobo: order.grossAmountKobo,
      discount_amount_kobo: order.discountAmountKobo,
      net_amount_kobo: order.netAmountKobo,
      bank_transfer_amount_ngn: resolvedAmount,
      bank_transfer_rate: usdToNgnRate,
      bank_transfer_bank_code: resolvedBankCode,
      plan_id: order.planId,
      account_size: order.accountSize,
      coupon_code: order.couponCode,
      checkout_url: order.checkoutUrl,
      payer_bank_name: resolvedBankName || order.safehavenBankName,
      payer_account_name: resolvedAccountName || order.safehavenAccountName,
      payer_virtual_acc_no: resolvedAccountNumber || order.safehavenAccountNumber,
      expires_at: order.safehavenExpiresAt?.toISOString() ?? null,
      challenge_id: null,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const createCryptoOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { plan_id, account_size, amount_kobo, crypto_currency } = req.body as {
      plan_id?: string
      account_size?: string
      amount_kobo?: number
      crypto_currency?: keyof typeof CRYPTO_ADDRESSES
    }

    if (!plan_id || !account_size || !amount_kobo || !crypto_currency) {
      throw new ApiError('plan_id, account_size, amount_kobo, crypto_currency are required', 400)
    }

    const normalizedCurrency = crypto_currency.toUpperCase() as keyof typeof CRYPTO_ADDRESSES
    if (!(normalizedCurrency in CRYPTO_ADDRESSES)) {
      throw new ApiError('Unsupported crypto currency', 400)
    }

    const address = resolveCryptoAddress(normalizedCurrency)
    if (!address) {
      throw new ApiError('Unsupported crypto currency', 400)
    }

    const providerOrderId = `CRYPTO-${Date.now()}-${Math.floor(Math.random() * 9999)}`
    const order = await prisma.order.create({
      data: {
        providerOrderId,
        status: 'pending',
        assignmentStatus: 'unassigned',
        currency: 'USD',
        grossAmountKobo: amount_kobo,
        discountAmountKobo: 0,
        netAmountKobo: amount_kobo,
        planId: plan_id,
        accountSize: account_size,
        paymentMethod: 'crypto',
        paymentProvider: 'manual',
        cryptoCurrency: normalizedCurrency,
        cryptoAddress: address,
        userId: user.id,
      },
    })

    res.json({
      provider_order_id: order.providerOrderId,
      status: order.status,
      assignment_status: order.assignmentStatus,
      currency: order.currency,
      gross_amount_kobo: order.grossAmountKobo,
      discount_amount_kobo: order.discountAmountKobo,
      net_amount_kobo: order.netAmountKobo,
      plan_id: order.planId,
      account_size: order.accountSize,
      crypto_currency: order.cryptoCurrency,
      crypto_address: order.cryptoAddress,
      crypto_networks: order.cryptoCurrency === 'USDT'
        ? {
          ERC20: env.cryptoEthAddress,
          SOL: env.cryptoSolAddress,
          TRC20: env.cryptoTrxAddress,
        }
        : null,
      challenge_id: null,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const handleSafeHavenWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as { sessionId?: string; status?: string; externalReference?: string }
    if (!payload?.externalReference) {
      res.status(200).json({ received: true })
      return
    }

    const order = await prisma.order.findUnique({
      where: { providerOrderId: payload.externalReference },
    })

    if (!order) {
      res.status(200).json({ received: true })
      return
    }

    const status = payload.status?.toLowerCase() ?? 'pending'
    const mapped = status.includes('success') || status === 'completed' ? 'completed' : status

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: mapped === 'completed' ? 'completed' : 'pending',
        paidAt: mapped === 'completed' ? new Date() : order.paidAt,
        safehavenSessionId: payload.sessionId ?? order.safehavenSessionId,
      },
    })

    res.json({ received: true })
  } catch (err) {
    next(err as Error)
  }
}