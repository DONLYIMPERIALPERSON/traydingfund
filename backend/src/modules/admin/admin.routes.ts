import { Router } from 'express'
import { getAdminMe, getDashboardStats } from './admin.controller'
import { approveCryptoOrder, declineCryptoOrder, listOrders } from './admin.orders.controller'
import { authenticate, requireRole } from '../../common/auth'
import { createAllowlistEntry, deleteAllowlistEntry, listAllowlist, updateAllowlistEntry } from './admin.allowlist.controller'
import { deleteReadyCTraderAccount, getCTraderSummary, listCTraderAccounts, uploadCTraderAccounts } from './ctrader.controller'

export const adminRouter = Router()

adminRouter.get('/me', authenticate, requireRole(['admin', 'super_admin']), getAdminMe)
adminRouter.get('/dashboard', authenticate, requireRole(['admin', 'super_admin']), getDashboardStats)
adminRouter.get('/orders', authenticate, requireRole(['admin', 'super_admin']), listOrders)
adminRouter.post('/orders/:id/approve', authenticate, requireRole(['admin', 'super_admin']), approveCryptoOrder)
adminRouter.post('/orders/:id/decline', authenticate, requireRole(['admin', 'super_admin']), declineCryptoOrder)
adminRouter.post('/ctrader/accounts/upload', authenticate, requireRole(['admin', 'super_admin']), uploadCTraderAccounts)
adminRouter.delete('/ctrader/accounts/:id', authenticate, requireRole(['admin', 'super_admin']), deleteReadyCTraderAccount)
adminRouter.get('/ctrader/accounts', authenticate, requireRole(['admin', 'super_admin']), listCTraderAccounts)
adminRouter.get('/ctrader/summary', authenticate, requireRole(['admin', 'super_admin']), getCTraderSummary)
adminRouter.get('/allowlist', authenticate, requireRole(['super_admin']), listAllowlist)
adminRouter.post('/allowlist', authenticate, requireRole(['super_admin']), createAllowlistEntry)
adminRouter.patch('/allowlist/:id', authenticate, requireRole(['super_admin']), updateAllowlistEntry)
adminRouter.delete('/allowlist/:id', authenticate, requireRole(['super_admin']), deleteAllowlistEntry)