import dotenv from 'dotenv'

dotenv.config()

const required = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required env var: ${key}`)
  }
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 5005),
  backendBaseUrl: required('BACKEND_BASE_URL'),
  backendAccessConfirmPath: process.env.BACKEND_ACCESS_CONFIRM_PATH ?? '/trader/access-confirmed',
  accessEngineApiKey: required('ACCESS_ENGINE_API_KEY'),
  telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
  telegramChatId: required('TELEGRAM_CHAT_ID'),
  telegramAllowedUsers: (process.env.TELEGRAM_ALLOWED_USERS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  telegramCommandPrefix: process.env.TELEGRAM_COMMAND_PREFIX ?? '/access_granted',
}