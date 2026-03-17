import { Router } from 'express'
import { checkEmailExists } from './auth.controller'

export const authRouter = Router()

authRouter.get('/email-exists', checkEmailExists)