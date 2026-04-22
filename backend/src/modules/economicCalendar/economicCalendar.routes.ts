import { Router } from 'express'
import { authenticate, requireRole } from '../../common/auth'
import { getEconomicCalendar } from './economicCalendar.controller'

export const economicCalendarRouter = Router()

economicCalendarRouter.get('/', authenticate, requireRole('trader'), getEconomicCalendar)