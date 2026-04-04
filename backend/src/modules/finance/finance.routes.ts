import { Router } from 'express'
import { resetComplete, withdrawComplete, adjustBalance, withdrawApproved } from './finance.controller'

export const financeRouter = Router()

financeRouter.post('/reset-complete', resetComplete)
financeRouter.post('/withdraw-approved', withdrawApproved)
financeRouter.post('/withdraw-complete', withdrawComplete)
financeRouter.post('/adjust-balance', adjustBalance)