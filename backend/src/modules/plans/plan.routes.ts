import { Router } from 'express'
import { listPublicPlans } from './plan.controller'

export const planRouter = Router()

planRouter.get('/plans', listPublicPlans)