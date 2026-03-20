import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import { env } from './config/env'
import { errorHandler, notFoundHandler } from './common/errors'
import { router } from './routes'

export const createApp = () => {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: '*', credentials: true }))
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