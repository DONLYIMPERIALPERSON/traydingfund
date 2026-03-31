import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../../config/env'
import { checkEmailExists } from './auth.controller'

export const authRouter = Router()

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.rateLimitAuthMax,
  standardHeaders: true,
  legacyHeaders: false,
})

authRouter.get('/email-exists', authLimiter, checkEmailExists)