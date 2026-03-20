import express, { Request, Response } from 'express'
import { config } from './config'
import { createTelegramBot, formatAccessRequestMessage } from './telegram'
import type { AccessGrantRequest, AccessGrantResponse } from './types'

const app = express()
app.use(express.json())

const bot = createTelegramBot()

const isValidAccessRequest = (payload: Partial<AccessGrantRequest>): payload is AccessGrantRequest => {
  return Boolean(payload.user_email && payload.account_number && payload.broker && payload.platform)
}

app.post('/access-engine/grant', async (req: Request, res: Response) => {
  const apiKey = req.header('x-access-engine-key')
  if (apiKey !== config.accessEngineApiKey) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const payload = req.body as Partial<AccessGrantRequest>
  if (!isValidAccessRequest(payload)) {
    res.status(400).json({ message: 'user_email, account_number, broker, platform are required' })
    return
  }

  const message = formatAccessRequestMessage(payload)
  await bot.sendMessage(config.telegramChatId, message)

  const response: AccessGrantResponse = {
    status: 'sent',
    message: 'Access request sent to Telegram',
  }

  res.json(response)
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

export const startServer = () => {
  app.listen(config.port, () => {
    console.log(`Access engine listening on port ${config.port}`)
  })
}