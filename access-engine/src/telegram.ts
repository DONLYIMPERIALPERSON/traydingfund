import TelegramBot from 'node-telegram-bot-api'
import { config } from './config'
import type { AccessGrantRequest, AccessCommandResult } from './types'

const normalizeAccountNumber = (raw: string) => raw.replace(/[^0-9]/g, '')

const isAllowedUser = (userId?: number) => {
  if (!userId) return false
  if (config.telegramAllowedUsers.length === 0) return true
  return config.telegramAllowedUsers.includes(String(userId))
}

const handleTelegramMessage = async (bot: TelegramBot, message: TelegramBot.Message) => {
  if (!message.text) return
  if (!isAllowedUser(message.from?.id)) {
    return
  }

  const text = message.text.trim()
  if (!text.startsWith(config.telegramCommandPrefix)) return

  const accountNumberRaw = text.replace(config.telegramCommandPrefix, '').trim()
  const accountNumber = normalizeAccountNumber(accountNumberRaw)

  if (!accountNumber) {
    await bot.sendMessage(message.chat.id, 'Account number missing. Use /access_granted<accountnumber>.')
    return
  }

  await bot.sendMessage(message.chat.id, `Access granted for account ${accountNumber}. Updating backend...`)

  const result = await notifyBackendAccessGranted({
    accountNumber,
    requestedBy: message.from?.username ?? message.from?.first_name ?? 'telegram',
  })

  await bot.sendMessage(message.chat.id, result.message)
}

export const createTelegramBot = () => {
  const bot = new TelegramBot(config.telegramBotToken)
  return bot
}

export const registerWebhook = async (bot: TelegramBot) => {
  const webhookUrl = `${config.publicBaseUrl}${config.telegramWebhookPath}`
  await bot.setWebHook(webhookUrl)
  return webhookUrl
}

export const processTelegramUpdate = async (
  bot: TelegramBot,
  update: TelegramBot.Update,
) => {
  if (update.message) {
    await handleTelegramMessage(bot, update.message)
  }
}

export const notifyBackendAccessGranted = async ({
  accountNumber,
  requestedBy,
}: {
  accountNumber: string
  requestedBy: string
}): Promise<AccessCommandResult> => {
  const response = await fetch(`${config.backendBaseUrl}${config.backendAccessConfirmPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-engine-key': config.accessEngineApiKey,
    },
    body: JSON.stringify({
      account_number: accountNumber,
      user_email: requestedBy,
      status: 'granted',
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    return {
      accountNumber,
      status: 'rejected',
      message: `Backend update failed for ${accountNumber}: ${text || response.statusText}`,
    }
  }

  return {
    accountNumber,
    status: 'granted',
    message: `Backend updated for account ${accountNumber}.`,
  }
}

export const formatAccessRequestMessage = (payload: AccessGrantRequest) => {
  return [
    'New access request',
    `Account: ${payload.account_number}`,
    `User: ${payload.user_email}`,
    `Broker: ${payload.broker}`,
    `Platform: ${payload.platform}`,
    '',
    `Grant using: ${config.telegramCommandPrefix}${payload.account_number}`,
  ].join('\n')
}