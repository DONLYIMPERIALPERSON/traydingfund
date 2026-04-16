import { Router } from 'express'
import { z } from 'zod'
import { authenticate, requireRole } from '../../common/auth'
import { validate } from '../../common/validation'
import {
  listAdminRecoveryRequests,
  listMyRecoveryRequests,
  reviewRecoveryRequest,
  submitRecoveryRequest,
} from './accountRecovery.controller'

export const accountRecoveryRouter = Router()

const recoveryRequestSchema = z.object({
  email: z.string().email(),
  account_number: z.string().min(1),
  platform: z.enum(['ctrader', 'mt5']),
  phase: z.string().min(1),
  account_type: z.string().min(1),
  account_size: z.string().min(1),
})

const reviewRecoverySchema = z.object({
  action: z.enum(['approve', 'decline']),
  review_note: z.string().optional(),
  decline_reason: z.string().optional(),
  platform: z.enum(['ctrader', 'mt5']).optional(),
  broker_name: z.string().optional(),
  mt5_login: z.string().optional(),
  mt5_server: z.string().optional(),
  mt5_password: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.action === 'approve') {
    if (!data.platform) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'platform is required for approval', path: ['platform'] })
    }
    if (data.platform === 'mt5') {
      if (!data.mt5_server?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'mt5_server is required for MT5 approval', path: ['mt5_server'] })
      }
      if (!data.mt5_password?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'mt5_password is required for MT5 approval', path: ['mt5_password'] })
      }
    }
  }
})

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
})

accountRecoveryRouter.get('/trader', authenticate, requireRole('trader'), listMyRecoveryRequests)
accountRecoveryRouter.post('/trader', authenticate, requireRole('trader'), validate({ body: recoveryRequestSchema }), submitRecoveryRequest)

accountRecoveryRouter.get('/admin', authenticate, requireRole(['admin', 'super_admin']), listAdminRecoveryRequests)
accountRecoveryRouter.post('/admin/:id/review', authenticate, requireRole(['admin', 'super_admin']), validate({ params: idSchema, body: reviewRecoverySchema }), reviewRecoveryRequest)