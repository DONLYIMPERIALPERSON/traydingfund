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
  const isAllowedOrigin = (origin?: string | null) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return true
    }

    try {
      const { hostname, protocol } = new URL(origin)
      if (!['http:', 'https:'].includes(protocol)) {
        return false
      }

      return hostname === 'machefunded.com'
        || hostname.endsWith('.machefunded.com')
        || hostname.endsWith('.vercel.app')
    } catch {
      return false
    }
  }

  app.use(helmet())
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
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
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ limit: '50mb', extended: true }))
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api', router)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}