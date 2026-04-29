import { Router } from 'express'
import { clearUserPaymentMethod, getAdminMe, getDashboardStats, listActiveChallengeAccounts, listAdminUsers, listAtticChallengeAccounts, listBreachedChallengeAccounts, listBreezyAccounts, listFundedChallengeAccounts, listTopFundedTraders, lookupChallengeAccount, lookupUserPaymentMethod } from './admin.controller'
import { approveCryptoOrder, declineCryptoOrder, getOrderStats, listOrders, listPendingAssignments, retryPendingAssignments } from './admin.orders.controller'
import { authenticate, requireRole } from '../../common/auth'
import { createAllowlistEntry, deleteAllowlistEntry, listAllowlist, updateAllowlistEntry } from './admin.allowlist.controller'
import { adminResetAccount, deleteReadyCTraderAccount, downloadCTraderTemplate, forceAssignNextStage, getCTraderSummary, listCTraderAccounts, logCTraderCredentialView, replaceUserAccount, updateMt5Password, uploadCTraderAccounts } from './ctrader.controller'
import { listAdminKycProfiles, listAdminKycRequests, reviewKycRequest } from '../kyc/kyc.admin.controller'
import { createCouponAdmin, deleteCouponAdmin, listCouponsAdmin, updateCouponChallengeTypeAdmin, updateCouponPlanAdmin, updateCouponStatusAdmin } from '../coupons/coupon.controller'
import {
  listAdminAffiliateOverview,
  listAdminAffiliateCommissions,
  listAdminAffiliatePayouts,
  approveAffiliatePayout,
  rejectAffiliatePayout,
} from '../affiliate/affiliate.controller'

export const adminRouter = Router()

adminRouter.get('/me', authenticate, requireRole(['admin', 'super_admin']), getAdminMe)
adminRouter.get('/dashboard', authenticate, requireRole(['admin', 'super_admin']), getDashboardStats)
adminRouter.get('/users', authenticate, requireRole(['admin', 'super_admin']), listAdminUsers)
adminRouter.get('/challenges/active', authenticate, requireRole(['admin', 'super_admin']), listActiveChallengeAccounts)
adminRouter.get('/challenges/attic', authenticate, requireRole(['admin', 'super_admin']), listAtticChallengeAccounts)
adminRouter.get('/challenges/lookup', authenticate, requireRole(['admin', 'super_admin']), lookupChallengeAccount)
adminRouter.get('/challenges/breezy', authenticate, requireRole(['admin', 'super_admin']), listBreezyAccounts)
adminRouter.get('/users/payment-method', authenticate, requireRole(['admin', 'super_admin']), lookupUserPaymentMethod)
adminRouter.post('/users/payment-method/clear', authenticate, requireRole(['admin', 'super_admin']), clearUserPaymentMethod)
adminRouter.get('/challenges/funded', authenticate, requireRole(['admin', 'super_admin']), listFundedChallengeAccounts)
adminRouter.get('/challenges/funded/top', authenticate, requireRole(['admin', 'super_admin']), listTopFundedTraders)
adminRouter.get('/challenges/breaches', authenticate, requireRole(['admin', 'super_admin']), listBreachedChallengeAccounts)
adminRouter.get('/orders', authenticate, requireRole(['admin', 'super_admin']), listOrders)
adminRouter.get('/orders/stats', authenticate, requireRole(['admin', 'super_admin']), getOrderStats)
adminRouter.get('/orders/pending-assign', authenticate, requireRole(['admin', 'super_admin']), listPendingAssignments)
adminRouter.post('/orders/pending-assign/retry', authenticate, requireRole(['admin', 'super_admin']), retryPendingAssignments)
adminRouter.post('/orders/:id/approve', authenticate, requireRole(['admin', 'super_admin']), approveCryptoOrder)
adminRouter.post('/orders/:id/decline', authenticate, requireRole(['admin', 'super_admin']), declineCryptoOrder)
adminRouter.post('/ctrader/accounts/upload', authenticate, requireRole(['admin', 'super_admin']), uploadCTraderAccounts)
adminRouter.get('/ctrader/accounts/template', authenticate, requireRole(['admin', 'super_admin']), downloadCTraderTemplate)
adminRouter.delete('/ctrader/accounts/:id', authenticate, requireRole(['admin', 'super_admin']), deleteReadyCTraderAccount)
adminRouter.get('/ctrader/accounts', authenticate, requireRole(['admin', 'super_admin']), listCTraderAccounts)
adminRouter.post('/ctrader/accounts/credential-views', authenticate, requireRole(['admin', 'super_admin']), logCTraderCredentialView)
adminRouter.post('/ctrader/accounts/reset', authenticate, requireRole(['admin', 'super_admin']), adminResetAccount)
adminRouter.post('/ctrader/accounts/update-password', authenticate, requireRole(['admin', 'super_admin']), updateMt5Password)
adminRouter.post('/ctrader/accounts/replace', authenticate, requireRole(['admin', 'super_admin']), replaceUserAccount)
adminRouter.post('/ctrader/accounts/force-next-stage', authenticate, requireRole(['admin', 'super_admin']), forceAssignNextStage)
adminRouter.get('/ctrader/summary', authenticate, requireRole(['admin', 'super_admin']), getCTraderSummary)
adminRouter.get('/allowlist', authenticate, requireRole(['super_admin']), listAllowlist)
adminRouter.post('/allowlist', authenticate, requireRole(['super_admin']), createAllowlistEntry)
adminRouter.patch('/allowlist/:id', authenticate, requireRole(['super_admin']), updateAllowlistEntry)
adminRouter.delete('/allowlist/:id', authenticate, requireRole(['super_admin']), deleteAllowlistEntry)
adminRouter.get('/kyc/profiles', authenticate, requireRole(['admin', 'super_admin']), listAdminKycProfiles)
adminRouter.get('/kyc/requests', authenticate, requireRole(['admin', 'super_admin']), listAdminKycRequests)
adminRouter.post('/kyc/requests/:id/review', authenticate, requireRole(['admin', 'super_admin']), reviewKycRequest)
adminRouter.get('/affiliate/overview', authenticate, requireRole(['admin', 'super_admin']), listAdminAffiliateOverview)
adminRouter.get('/affiliate/commissions', authenticate, requireRole(['admin', 'super_admin']), listAdminAffiliateCommissions)
adminRouter.get('/affiliate/payouts', authenticate, requireRole(['admin', 'super_admin']), listAdminAffiliatePayouts)
adminRouter.post('/affiliate/payouts/:id/approve', authenticate, requireRole(['admin', 'super_admin']), approveAffiliatePayout)
adminRouter.post('/affiliate/payouts/:id/reject', authenticate, requireRole(['admin', 'super_admin']), rejectAffiliatePayout)
adminRouter.get('/coupons', authenticate, requireRole(['admin', 'super_admin']), listCouponsAdmin)
adminRouter.post('/coupons', authenticate, requireRole(['admin', 'super_admin']), createCouponAdmin)
adminRouter.patch('/coupons/:id/status', authenticate, requireRole(['admin', 'super_admin']), updateCouponStatusAdmin)
adminRouter.patch('/coupons/:id/plans', authenticate, requireRole(['admin', 'super_admin']), updateCouponPlanAdmin)
adminRouter.patch('/coupons/:id/challenge-types', authenticate, requireRole(['admin', 'super_admin']), updateCouponChallengeTypeAdmin)
adminRouter.delete('/coupons/:id', authenticate, requireRole(['admin', 'super_admin']), deleteCouponAdmin)