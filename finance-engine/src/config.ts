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
  port: Number(process.env.PORT ?? 5010),
  publicBaseUrl: required('PUBLIC_BASE_URL'),
  backendBaseUrl: required('BACKEND_BASE_URL'),
  backendResetPath: process.env.BACKEND_RESET_PATH ?? '/api/v1/finance/reset-complete',
  backendWithdrawApprovedPath: process.env.BACKEND_WITHDRAW_APPROVED_PATH ?? '/api/v1/finance/withdraw-approved',
  backendWithdrawPath: process.env.BACKEND_WITHDRAW_PATH ?? '/api/v1/finance/withdraw-complete',
  backendAdjustPath: process.env.BACKEND_ADJUST_PATH ?? '/api/v1/finance/adjust-balance',
  backendFinanceKey: required('FINANCE_ENGINE_API_KEY'),
  telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
  telegramChatId: required('TELEGRAM_CHAT_ID'),
  telegramAllowedUsers: (process.env.TELEGRAM_ALLOWED_USERS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  telegramWebhookPath: process.env.TELEGRAM_WEBHOOK_PATH ?? '/telegram/webhook',
}