import express, { Request, Response } from 'express'
import { config } from './config'
import { createTelegramBot, processTelegramUpdate, registerWebhook, sendFinanceEventMessage } from './telegram'
import type { FinanceEventPayload } from './types'

const app = express()
app.use(express.json())

const bot = createTelegramBot()

const verifyKey = (req: Request, res: Response) => {
  const apiKey = req.header('x-finance-engine-key')
  if (apiKey !== config.backendFinanceKey) {
    res.status(401).json({ message: 'Unauthorized' })
    return false
  }
  return true
}

app.post('/finance-engine/event', async (req: Request, res: Response) => {
  if (!verifyKey(req, res)) return
  const payload = req.body as FinanceEventPayload
  if (!payload?.type || !payload.account) {
    res.status(400).json({ message: 'type and account are required' })
    return
  }
  await sendFinanceEventMessage(bot, payload)
  res.json({ status: 'sent' })
})

app.post(config.telegramWebhookPath, async (req: Request, res: Response) => {
  try {
    await processTelegramUpdate(bot, req.body)
    res.status(200).json({ status: 'ok' })
  } catch (error) {
    console.error('Failed to process Telegram update', error)
    res.status(500).json({ status: 'error' })
  }
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

export const startServer = () => {
  app.listen(config.port, async () => {
    console.log(`Finance engine listening on port ${config.port}`)
    if (!config.publicBaseUrl.startsWith('https://')) {
      console.warn('Skipping Telegram webhook registration; PUBLIC_BASE_URL must be HTTPS for Telegram webhooks.')
      return
    }

    try {
      const webhookUrl = await registerWebhook(bot)
      console.log(`Telegram webhook registered: ${webhookUrl}`)
    } catch (error) {
      console.error('Failed to register Telegram webhook', error)
    }
  })
}