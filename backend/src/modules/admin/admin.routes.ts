import { Router } from 'express'
import { getAdminMe, getDashboardStats } from './admin.controller'
import { authenticate, requireRole } from '../../common/auth'

export const adminRouter = Router()

adminRouter.get('/me', authenticate, requireRole(['admin', 'super_admin']), getAdminMe)
adminRouter.get('/dashboard', authenticate, requireRole(['admin', 'super_admin']), getDashboardStats)