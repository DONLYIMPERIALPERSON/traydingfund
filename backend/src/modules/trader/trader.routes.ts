import { Router } from 'express'
import { getMe, listChallengeAccounts, getChallengeAccountDetail } from './trader.controller'
import { createBankTransferOrder, createCryptoOrder, handleSafeHavenWebhook, listOrders } from './orders.controller'
import { authenticate, requireRole } from '../../common/auth'

export const traderRouter = Router()

traderRouter.get('/me', authenticate, requireRole('trader'), getMe)
traderRouter.get('/challenges', authenticate, requireRole('trader'), listChallengeAccounts)
traderRouter.get('/challenges/:challengeId', authenticate, requireRole('trader'), getChallengeAccountDetail)
traderRouter.get('/orders', authenticate, requireRole('trader'), listOrders)
traderRouter.post('/orders/bank-transfer', authenticate, requireRole('trader'), createBankTransferOrder)
traderRouter.post('/orders/crypto', authenticate, requireRole('trader'), createCryptoOrder)
traderRouter.post('/safehaven/webhook', handleSafeHavenWebhook)