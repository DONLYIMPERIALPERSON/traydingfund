import { Router } from 'express'
import { z } from 'zod'
import { validate, paginationSchema } from '../../common/validation'
import {
  getMe,
  listChallengeAccounts,
  getChallengeAccountDetail,
  getChallengeCalendar,
  downloadBreachReport,
  generateBreachReportPreviews,
  generateRewardCertificatePreview,
  generateOnboardingCertificatePreview,
  generatePassedChallengeCertificatePreview,
  listCertificates,
  updateProfile,
  requestChallengeRefresh,
} from './trader.controller'
import {
  createBankTransferOrder,
  createBreezyRenewalOrder,
  createFreeOrder,
  createCryptoOrder,
  handleSafeHavenWebhook,
  listOrders,
  getOrderStatus,
  confirmAccessGrant,
  markAccountStatus,
} from './orders.controller'
import {
  getAffiliateDashboard,
  listAffiliateCommissions,
  listAffiliatePayouts,
  requestAffiliatePayout,
} from '../affiliate/affiliate.controller'
import { authenticate, requireRole } from '../../common/auth'

export const traderRouter = Router()

const updateProfileSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  nick_name: z.string().min(1).nullable().optional(),
  use_nickname_for_certificates: z.boolean().optional(),
  overall_reward_currency: z.enum(['USD', 'NGN']).optional(),
}).refine(
  (data) => Boolean(data.first_name) === Boolean(data.last_name),
  { message: 'first_name and last_name are required together' }
)

const challengeRefreshSchema = z.object({
  challenge_id: z.string().min(1),
})

const breezyRenewalParamsSchema = z.object({
  accountId: z.coerce.number().int().positive(),
})

const bankTransferOrderSchema = z.object({
  plan_id: z.string().min(1),
  account_size: z.string().min(1),
  amount_kobo: z.coerce.number().int().positive(),
  coupon_code: z.string().min(1).nullable().optional(),
  challenge_type: z.string().min(1),
  phase: z.string().min(1),
  platform: z.enum(['ctrader', 'mt5']).optional(),
  affiliate_id: z.coerce.number().int().positive().optional(),
})

const freeOrderSchema = z.object({
  plan_id: z.string().min(1),
  account_size: z.string().min(1),
  amount_kobo: z.coerce.number().int().positive(),
  coupon_code: z.string().min(1).nullable().optional(),
  challenge_type: z.string().min(1),
  phase: z.string().min(1),
  platform: z.enum(['ctrader', 'mt5']).optional(),
  affiliate_id: z.coerce.number().int().positive().optional(),
})

const cryptoOrderSchema = z.object({
  plan_id: z.string().min(1),
  account_size: z.string().min(1),
  amount_kobo: z.coerce.number().int().positive(),
  crypto_currency: z.enum(['BTC', 'ETH', 'SOL', 'TRX', 'USDT']),
  challenge_type: z.string().min(1),
  phase: z.string().min(1),
  coupon_code: z.string().min(1).nullable().optional(),
  platform: z.enum(['ctrader', 'mt5']).optional(),
  affiliate_id: z.coerce.number().int().positive().optional(),
})

const affiliatePayoutSchema = z.object({})

traderRouter.get('/me', authenticate, requireRole('trader'), getMe)
traderRouter.patch('/me', authenticate, requireRole('trader'), validate({ body: updateProfileSchema }), updateProfile)
traderRouter.get('/certificates', authenticate, requireRole('trader'), validate({ query: paginationSchema }), listCertificates)
traderRouter.post('/certificates/reward-preview', generateRewardCertificatePreview)
traderRouter.post('/certificates/onboarding-preview', generateOnboardingCertificatePreview)
traderRouter.post('/certificates/passed-challenge-preview', generatePassedChallengeCertificatePreview)
traderRouter.post('/certificates/breach-report-previews', generateBreachReportPreviews)
traderRouter.get('/challenges', authenticate, requireRole('trader'), listChallengeAccounts)
traderRouter.get('/challenges/:challengeId', authenticate, requireRole('trader'), getChallengeAccountDetail)
traderRouter.get('/challenges/:challengeId/calendar', authenticate, requireRole('trader'), getChallengeCalendar)
traderRouter.get('/challenges/:challengeId/breach-report', authenticate, requireRole('trader'), downloadBreachReport)
traderRouter.post('/challenges/refresh', authenticate, requireRole('trader'), validate({ body: challengeRefreshSchema }), requestChallengeRefresh)
traderRouter.get('/orders', authenticate, requireRole('trader'), validate({ query: paginationSchema }), listOrders)
traderRouter.get('/orders/:providerOrderId', authenticate, requireRole('trader'), getOrderStatus)
traderRouter.post('/orders/bank-transfer', authenticate, requireRole('trader'), validate({ body: bankTransferOrderSchema }), createBankTransferOrder)
traderRouter.post('/breezy/:accountId/renew', authenticate, requireRole('trader'), validate({ params: breezyRenewalParamsSchema }), createBreezyRenewalOrder)
traderRouter.post('/orders/free', authenticate, requireRole('trader'), validate({ body: freeOrderSchema }), createFreeOrder)
traderRouter.post('/orders/crypto', authenticate, requireRole('trader'), validate({ body: cryptoOrderSchema }), createCryptoOrder)
traderRouter.post('/safehaven/webhook', handleSafeHavenWebhook)
traderRouter.post('/access-confirmed', confirmAccessGrant)
traderRouter.post('/account-status', markAccountStatus)
traderRouter.get('/affiliate/summary', authenticate, requireRole('trader'), getAffiliateDashboard)
traderRouter.get('/affiliate/commissions', authenticate, requireRole('trader'), validate({ query: paginationSchema }), listAffiliateCommissions)
traderRouter.get('/affiliate/payouts', authenticate, requireRole('trader'), validate({ query: paginationSchema }), listAffiliatePayouts)
traderRouter.post('/affiliate/payouts', authenticate, requireRole('trader'), validate({ body: affiliatePayoutSchema }), requestAffiliatePayout)