import { Router } from 'express'
import { z } from 'zod'
import { validate, paginationSchema } from '../../common/validation'
import { authenticate, requireRole } from '../../common/auth'
import {
  getPayoutSummary,
  requestPayout,
  getOverallRewardCertificate,
  listAdminPayouts,
  approvePayoutRequest,
  rejectPayoutRequest,
} from './payouts.controller'

export const payoutRouter = Router()

const payoutRequestSchema = z.object({
  account_id: z.coerce.number().int().positive(),
})

const adminPayoutActionSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const adminPayoutRejectionSchema = z.object({
  reason: z.string().min(1).optional(),
})

payoutRouter.get('/summary', authenticate, requireRole('trader'), getPayoutSummary)
payoutRouter.get('/overall-reward-certificate', authenticate, requireRole('trader'), getOverallRewardCertificate)
payoutRouter.post('/request', authenticate, requireRole('trader'), validate({ body: payoutRequestSchema }), requestPayout)

payoutRouter.get('/admin/requests', authenticate, requireRole(['admin', 'super_admin']), validate({ query: paginationSchema }), listAdminPayouts)
payoutRouter.post('/admin/requests/:id/approve', authenticate, requireRole(['admin', 'super_admin']), validate({ params: adminPayoutActionSchema }), approvePayoutRequest)
payoutRouter.post('/admin/requests/:id/reject', authenticate, requireRole(['admin', 'super_admin']), validate({ params: adminPayoutActionSchema, body: adminPayoutRejectionSchema }), rejectPayoutRequest)
