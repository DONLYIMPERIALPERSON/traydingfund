import { Router } from 'express'
import { authenticate, requireRole } from '../../common/auth'
import {
  getPayoutSummary,
  requestPayout,
  listAdminPayouts,
  approvePayoutRequest,
  rejectPayoutRequest,
} from './payouts.controller'

export const payoutRouter = Router()

payoutRouter.get('/summary', authenticate, requireRole('trader'), getPayoutSummary)
payoutRouter.post('/request', authenticate, requireRole('trader'), requestPayout)

payoutRouter.get('/admin/requests', authenticate, requireRole(['admin', 'super_admin']), listAdminPayouts)
payoutRouter.post('/admin/requests/:id/approve', authenticate, requireRole(['admin', 'super_admin']), approvePayoutRequest)
payoutRouter.post('/admin/requests/:id/reject', authenticate, requireRole(['admin', 'super_admin']), rejectPayoutRequest)
