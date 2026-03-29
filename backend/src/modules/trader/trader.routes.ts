import { Router } from 'express'
import {
  getMe,
  listChallengeAccounts,
  getChallengeAccountDetail,
  generateRewardCertificatePreview,
  generateOnboardingCertificatePreview,
  generatePassedChallengeCertificatePreview,
  listCertificates,
  updateProfile,
  requestChallengeRefresh,
} from './trader.controller'
import {
  createBankTransferOrder,
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

traderRouter.get('/me', authenticate, requireRole('trader'), getMe)
traderRouter.patch('/me', authenticate, requireRole('trader'), updateProfile)
traderRouter.get('/certificates', authenticate, requireRole('trader'), listCertificates)
traderRouter.post('/certificates/reward-preview', generateRewardCertificatePreview)
traderRouter.post('/certificates/onboarding-preview', generateOnboardingCertificatePreview)
traderRouter.post('/certificates/passed-challenge-preview', generatePassedChallengeCertificatePreview)
traderRouter.get('/challenges', authenticate, requireRole('trader'), listChallengeAccounts)
traderRouter.get('/challenges/:challengeId', authenticate, requireRole('trader'), getChallengeAccountDetail)
traderRouter.post('/challenges/refresh', authenticate, requireRole('trader'), requestChallengeRefresh)
traderRouter.get('/orders', authenticate, requireRole('trader'), listOrders)
traderRouter.get('/orders/:providerOrderId', authenticate, requireRole('trader'), getOrderStatus)
traderRouter.post('/orders/bank-transfer', authenticate, requireRole('trader'), createBankTransferOrder)
traderRouter.post('/orders/free', authenticate, requireRole('trader'), createFreeOrder)
traderRouter.post('/orders/crypto', authenticate, requireRole('trader'), createCryptoOrder)
traderRouter.post('/safehaven/webhook', handleSafeHavenWebhook)
traderRouter.post('/access-confirmed', confirmAccessGrant)
traderRouter.post('/account-status', markAccountStatus)
traderRouter.get('/affiliate/summary', authenticate, requireRole('trader'), getAffiliateDashboard)
traderRouter.get('/affiliate/commissions', authenticate, requireRole('trader'), listAffiliateCommissions)
traderRouter.get('/affiliate/payouts', authenticate, requireRole('trader'), listAffiliatePayouts)
traderRouter.post('/affiliate/payouts', authenticate, requireRole('trader'), requestAffiliatePayout)