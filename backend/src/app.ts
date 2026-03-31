import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { env } from './config/env'
import { errorHandler, notFoundHandler } from './common/errors'
import { router } from './routes'

export const createApp = () => {
  const app = express()

  const allowedOrigins = env.allowedOrigins
  app.use(helmet())
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true)
        }
        return callback(new Error('CORS not allowed'), false)
      },
      credentials: true,
    })
  )
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: env.rateLimitGlobalMax,
      standardHeaders: true,
      legacyHeaders: false,
    })
  )
  app.use(express.json({ limit: '10mb' }))
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api', router)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}