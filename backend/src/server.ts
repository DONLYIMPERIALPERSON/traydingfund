import { createApp } from './app'
import { env } from './config/env'
import { prisma } from './config/prisma'

const app = createApp()

const start = async () => {
  try {
    await prisma.$connect()
    app.listen(env.port, () => {
      console.log(`API running on http://localhost:${env.port}`)
    })
  } catch (error) {
    console.error('Failed to connect to database', error)
    process.exit(1)
  }
}

const shutdown = async (signal: string) => {
  try {
    console.log(`Received ${signal}. Shutting down...`)
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error during shutdown', error)
  } finally {
    process.exit(0)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

start()