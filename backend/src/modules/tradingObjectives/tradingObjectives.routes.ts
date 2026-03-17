import { Router } from 'express'
import { authenticate, requireRole } from '../../common/auth'
import { getTradingObjectives, updateTradingObjectives } from './tradingObjectives.controller'

export const tradingObjectivesRouter = Router()

tradingObjectivesRouter.get('/', getTradingObjectives)
tradingObjectivesRouter.patch('/', authenticate, requireRole(['admin', 'super_admin']), updateTradingObjectives)