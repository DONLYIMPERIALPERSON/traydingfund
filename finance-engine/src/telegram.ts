import TelegramBot from 'node-telegram-bot-api'
import { config } from './config'
import { notifyAdjustBalance, notifyResetComplete, notifyWithdrawApproved, notifyWithdrawComplete } from './backendClient'

const normalize = (text: string) => text.trim().replace(/\s+/g, ' ')

const isAuthorizedUser = (userId?: number) => {
  if (!config.telegramAllowedUsers.length) return true
  if (!userId) return false
  return config.telegramAllowedUsers.includes(String(userId))
}

const parseCommand = (text?: string | null) => {
  if (!text) return null
  const normalized = normalize(text)
  const match = normalized.match(/^\/(reset_done|withdraw_done|withdraw_approved|adjust_balance)(\d+)$/i)
  if (match) {
    return [`/${match[1]}`, match[2]]
  }
  const withdrawApprovedCompact = normalized.match(/^\/withdraw_approved(\d+)[_:|-]([0-9]+(?:\.[0-9]+)?)$/i)
  if (withdrawApprovedCompact) {
    return ['/withdraw_approved', withdrawApprovedCompact[1], withdrawApprovedCompact[2]]
  }
  return normalized.split(' ')
}

const formatEventMessage = (payload: {
  type: string
  account: string
  accountSize?: string | null
  accountType?: string | null
  platform?: string
  profit?: number
  targetBalance?: number
  amount?: number
  currentBalance?: number | null
  profitSplitPercent?: number | null
  currentPhase?: string
  nextPhase?: string
  challengeType?: string
  ownerEmail?: string
  resetCommand?: string
}) => {
  const platformLine = payload.platform ? `Platform: ${payload.platform}` : null
  const accountSizeLine = payload.accountSize ? `Account Size: ${payload.accountSize}` : null
  const accountTypeLine = payload.accountType ? `Account Type: ${payload.accountType}` : null
  const currentBalanceLine = payload.currentBalance != null ? `Current Balance: ${payload.currentBalance}` : null
  const profitSplitLine = payload.profitSplitPercent != null ? `Profit Split: ${payload.profitSplitPercent}%` : null
  if (payload.type === 'PHASE_PASS') {
    const lines = [
      '✅ Phase passed',
      `Account: ${payload.account}`,
      accountSizeLine,
      accountTypeLine,
      platformLine,
      currentBalanceLine,
      profitSplitLine,
      `Profit to deduct: ${payload.profit ?? 0}`,
      `Target Balance: ${payload.targetBalance ?? ''}`,
      payload.currentPhase ? `Current Phase: ${payload.currentPhase}` : null,
      payload.nextPhase ? `Next Phase: ${payload.nextPhase}` : null,
      payload.challengeType ? `Challenge: ${payload.challengeType}` : null,
      payload.ownerEmail ? `Owner: ${payload.ownerEmail}` : null,
      payload.resetCommand ? 'Reset Command:' : null,
      payload.resetCommand ? payload.resetCommand.replace('/reset_done ', '/reset_done') : null,
    ].filter(Boolean)
    return lines.join('\n')
  }
  if (payload.type === 'WITHDRAW_REQUEST') {
    const compactApproveCommand = payload.account
      ? `/withdraw_approved${payload.account}${payload.amount != null ? `_${payload.amount}` : ''}`
      : null
    const compactDoneCommand = payload.account
      ? `/withdraw_done${payload.account}`
      : null
    return [
      '💸 Withdrawal requested',
      `Account: ${payload.account}`,
      accountSizeLine,
      accountTypeLine,
      platformLine,
      currentBalanceLine,
      profitSplitLine,
      `Amount: ${payload.amount ?? payload.profit ?? 0}`,
      compactApproveCommand ? 'Approve Command:' : null,
      compactApproveCommand,
      compactDoneCommand ? 'Done Command:' : null,
      compactDoneCommand,
    ].filter(Boolean).join('\n')
  }
  if (payload.type === 'WITHDRAWAL') {
    return [
      '💸 Withdrawal completed',
      `Account: ${payload.account}`,
      accountSizeLine,
      accountTypeLine,
      platformLine,
      currentBalanceLine,
      profitSplitLine,
      `Amount: ${payload.amount ?? payload.profit ?? 0}`,
    ].filter(Boolean).join('\n')
  }
  if (payload.type === 'ADJUST_BALANCE') {
    return [
      '🧮 Balance adjustment',
      `Account: ${payload.account}`,
      accountSizeLine,
      accountTypeLine,
      platformLine,
      currentBalanceLine,
      profitSplitLine,
      `Amount: ${payload.amount ?? payload.profit ?? payload.targetBalance ?? ''}`,
    ].filter(Boolean).join('\n')
  }
  return `Finance event: ${payload.type}`
}

export const createTelegramBot = () => new TelegramBot(config.telegramBotToken, { polling: false })

export const registerWebhook = async (bot: TelegramBot) => {
  const url = `${config.publicBaseUrl.replace(/\/$/, '')}${config.telegramWebhookPath}`
  await bot.setWebHook(url)
  return url
}

export const sendFinanceEventMessage = async (bot: TelegramBot, payload: {
  type: string
  account: string
  accountSize?: string | null
  accountType?: string | null
  platform?: string
  profit?: number
  targetBalance?: number
  amount?: number
  currentBalance?: number | null
  profitSplitPercent?: number | null
  currentPhase?: string
  nextPhase?: string
  challengeType?: string
  ownerEmail?: string
  resetCommand?: string
}) => {
  const message = formatEventMessage(payload)
  try {
    await bot.sendMessage(config.telegramChatId, message)
  } catch (error) {
    console.error('Telegram sendMessage failed', {
      chatId: config.telegramChatId,
      payload,
      error,
    })
    throw error
  }
}

export const processTelegramUpdate = async (bot: TelegramBot, update: TelegramBot.Update) => {
  if (!update.message) return
  const chatId = update.message.chat.id
  const userId = update.message.from?.id
  if (!isAuthorizedUser(userId)) {
    await bot.sendMessage(chatId, 'Unauthorized command.')
    return
  }

  const args = parseCommand(update.message.text)
  if (!args || args.length === 0) return
  const [command, ...rest] = args

  switch (command) {
    case '/reset_done': {
      const accountNumber = rest[0]
      if (!accountNumber) {
        await bot.sendMessage(chatId, 'Usage: /reset_done <account>')
        return
      }
      await notifyResetComplete(accountNumber)
      await bot.sendMessage(chatId, `✅ Reset completed for ${accountNumber}`)
      return
    }
    case '/withdraw_done': {
      const accountNumber = rest[0]
      if (!accountNumber) {
        await bot.sendMessage(chatId, 'Usage: /withdraw_done <account>')
        return
      }
      await notifyWithdrawComplete(accountNumber)
      await bot.sendMessage(chatId, `✅ Withdrawal completed for ${accountNumber}`)
      return
    }
    case '/withdraw_approved': {
      const accountNumber = rest[0]
      const amountRaw = rest[1]
      if (!accountNumber) {
        await bot.sendMessage(chatId, 'Usage: /withdraw_approved <account> [amount]')
        return
      }
      const amount = amountRaw ? Number(amountRaw) : undefined
      if (amountRaw && !Number.isFinite(amount)) {
        await bot.sendMessage(chatId, 'Amount must be a number.')
        return
      }
      await notifyWithdrawApproved(accountNumber, amount)
      await bot.sendMessage(chatId, `✅ Withdrawal approved for ${accountNumber}`)
      return
    }
    case '/adjust_balance': {
      const accountNumber = rest[0]
      const amountRaw = rest[1]
      if (!accountNumber || !amountRaw) {
        await bot.sendMessage(chatId, 'Usage: /adjust_balance <account> <amount> [reason]')
        return
      }
      const amount = Number(amountRaw)
      if (!Number.isFinite(amount)) {
        await bot.sendMessage(chatId, 'Amount must be a number.')
        return
      }
      const reason = rest.slice(2).join(' ') || undefined
      await notifyAdjustBalance(accountNumber, amount, reason)
      await bot.sendMessage(chatId, `✅ Balance adjustment submitted for ${accountNumber}`)
      return
    }
    default:
      await bot.sendMessage(chatId, 'Unknown command.')
  }
}