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
  const apiBaseUrl = `https://api.telegram.org/bot${config.telegramBotToken}`

  console.log('Preparing to register Telegram webhook:', {
    publicBaseUrl: config.publicBaseUrl,
    webhookPath: config.telegramWebhookPath,
    webhookUrl,
  })

  const infoResponse = await fetch(`${apiBaseUrl}/getWebhookInfo`)
  const infoPayload = await infoResponse.json()
  console.log('Telegram webhook info (before setWebhook):', infoPayload)

  const setResponse = await fetch(`${apiBaseUrl}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  })
  const setPayload = await setResponse.json()
  console.log('Telegram setWebhook response:', setPayload)

  if (!setResponse.ok) {
    throw new Error(`Telegram setWebhook failed: ${JSON.stringify(setPayload)}`)
  }

  const updatedInfoResponse = await fetch(`${apiBaseUrl}/getWebhookInfo`)
  const updatedInfoPayload = await updatedInfoResponse.json()
  console.log('Telegram webhook info (after setWebhook):', updatedInfoPayload)

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
  const includeMt5Credentials = config.sendMt5Credentials
    && payload.platform?.toLowerCase() === 'mt5'

  const details = [
    payload.user_name ? `Name: ${payload.user_name}` : null,
    payload.account_type ? `Account Type: ${payload.account_type}` : null,
    payload.account_phase ? `Phase: ${payload.account_phase}` : null,
    payload.account_size ? `Size: ${payload.account_size}` : null,
    includeMt5Credentials && payload.mt5_login
      ? `MT5 Login: ${payload.mt5_login}`
      : null,
    includeMt5Credentials && payload.mt5_server
      ? `MT5 Server: ${payload.mt5_server}`
      : null,
    includeMt5Credentials && payload.mt5_password
      ? `MT5 Password: ${payload.mt5_password}`
      : null,
  ].filter(Boolean)

  return [
    'New access request',
    ...(details.length ? [...details, ''] : []),
    `Account: ${payload.account_number}`,
    `User: ${payload.user_email}`,
    `Broker: ${payload.broker}`,
    `Platform: ${payload.platform}`,
    '',
    `Grant using: ${config.telegramCommandPrefix}${payload.account_number}`,
  ].join('\n')
}