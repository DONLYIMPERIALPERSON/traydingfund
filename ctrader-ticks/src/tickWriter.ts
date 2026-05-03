import fs from 'fs'
import path from 'path'

export type TickRecord = {
  symbol: string
  bid: number
  ask: number
  timestamp: number
}

const utcDayKey = (timestampMs: number) => {
  const d = new Date(timestampMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const safeSymbol = (symbol: string) => symbol.toUpperCase().replace(/[^A-Z0-9]/g, '')

export class TickWriter {
  constructor(private readonly baseDir: string) {}

  appendTick(tick: TickRecord) {
    const symbol = safeSymbol(tick.symbol)
    const day = utcDayKey(tick.timestamp)
    const dir = path.join(this.baseDir, symbol)
    const filePath = path.join(dir, `${day}.jsonl`)

    fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(filePath, `${JSON.stringify(tick)}\n`, 'utf8')
  }
}
