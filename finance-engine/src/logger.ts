import fs from 'fs'
import path from 'path'

const logDir = path.join(process.cwd(), 'logs')
const telegramFailureLogPath = path.join(logDir, 'telegram-failures.log')

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value)
  } catch {
    return JSON.stringify({ message: 'Failed to stringify log payload' })
  }
}

export const appendTelegramFailureLog = (entry: Record<string, unknown>) => {
  try {
    fs.mkdirSync(logDir, { recursive: true })
    const line = `${safeStringify({ timestamp: new Date().toISOString(), ...entry })}\n`
    fs.appendFileSync(telegramFailureLogPath, line, 'utf8')
  } catch (fileError) {
    console.error('Failed to write telegram failure log file', fileError)
  }
}

export const getTelegramFailureLogPath = () => telegramFailureLogPath