import { Router } from 'express'
import { getMe, listChallengeAccounts } from './trader.controller'
import { authenticate, requireRole } from '../../common/auth'

export const traderRouter = Router()

traderRouter.get('/me', authenticate, requireRole('trader'), getMe)
traderRouter.get('/challenges', authenticate, requireRole('trader'), listChallengeAccounts)