import fs from 'fs/promises'
import path from 'path'
import fontkit from '@pdf-lib/fontkit'
import { prisma } from '../config/prisma'
import { uploadBufferToR2 } from './r2.service'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'

const LOGO_URL = 'https://pub-e47c37a6a0b447288c2210b9e8f6faf5.r2.dev/login-page-logo.png'

const resolveBackendRoot = () => {
  const moduleAssets = path.join(__dirname, '..', '..', 'assets')
  return moduleAssets
}

const REGULAR_FONT_PATH = path.join(resolveBackendRoot(), 'fonts', 'static', 'OpenSans-Regular.ttf')
const BOLD_FONT_PATH = path.join(resolveBackendRoot(), 'fonts', 'static', 'OpenSans-Bold.ttf')
const BREACH_REPORT_BUCKET_PREFIX = 'breach-reports'

export type BreachReportPayload = {
  accountNumber: string
  challengeId: string
  traderName: string
  traderEmail: string
  accountSize: string
  phase: string
  challengeType: string
  platform: string
  currency: string
  status: string
  generatedAt: Date
  breachReason: string
  breachReasonLabel: string
  breachNarrative: string
  breachTimeLabel: string
  peakBalance: string
  balanceBeforeTrade: string
  equityAtBreach: string
  dailyLimit: string | null
  maxLimit: string | null
  dailyDrawdownUsageLabel: string | null
  maxDrawdownUsageLabel: string | null
  showEquityChart?: boolean
  balanceLineLabel?: string | null
  limitLineLabel?: string | null
  equityLineLabel?: string | null
  breachPointLabel?: string | null
  breachDetails: Array<{ label: string; value: string }>
  openPositions: Array<{ symbol: string; ticket: string; floatingPnl: string; time: string }>
  earlyClosedTrades?: Array<{ symbol: string; dealId: string; duration: string; closedAt: string }>
  analysisParagraph: string
  guidance: string[]
}

const isPng = (buffer: Buffer) => buffer.length >= 4
  && buffer[0] === 0x89
  && buffer[1] === 0x50
  && buffer[2] === 0x4e
  && buffer[3] === 0x47

const fetchLogoBytes = async () => {
  try {
    const response = await fetch(LOGO_URL)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

const drawWrappedText = (
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  options: {
    x: number
    y: number
    maxWidth: number
    lineHeight: number
    size: number
    font: any
    color?: ReturnType<typeof rgb>
  },
) => {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word
    const width = options.font.widthOfTextAtSize(trial, options.size)
    if (width <= options.maxWidth || !current) {
      current = trial
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - (index * options.lineHeight),
      size: options.size,
      font: options.font,
      color: options.color ?? rgb(0.17, 0.2, 0.24),
    })
  })
  return lines.length
}

const drawGauge = (
  page: ReturnType<PDFDocument['addPage']>,
  opts: {
    centerX: number
    centerY: number
    radius: number
    percent: number
    label: string
    valueLabel: string
    accent: ReturnType<typeof rgb>
    font: any
    boldFont: any
  },
) => {
  const steps = 36
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * 360
    const active = i < Math.round((Math.max(0, Math.min(opts.percent, 100)) / 100) * steps)
    page.drawRectangle({
      x: opts.centerX - 3,
      y: opts.centerY + opts.radius - 5,
      width: 6,
      height: 12,
      color: active ? opts.accent : rgb(0.9, 0.91, 0.93),
      rotate: degrees(angle),
      xSkew: degrees(0),
      ySkew: degrees(0),
    })
  }
  page.drawText(opts.label, {
    x: opts.centerX - (opts.boldFont.widthOfTextAtSize(opts.label, 11) / 2),
    y: opts.centerY - 10,
    size: 11,
    font: opts.boldFont,
    color: rgb(0.18, 0.22, 0.27),
  })
  page.drawText(opts.valueLabel, {
    x: opts.centerX - (opts.font.widthOfTextAtSize(opts.valueLabel, 10) / 2),
    y: opts.centerY - 24,
    size: 10,
    font: opts.font,
    color: rgb(0.4, 0.45, 0.5),
  })
}

export const buildBreachNarrative = (breachReason: string) => {
  const normalized = breachReason.toUpperCase()
  if (normalized === 'DAILY_DRAWDOWN') {
    return {
      title: 'Daily Drawdown Breach',
      narrative: 'Your account exceeded the allowed daily loss threshold. Once your equity dropped below the daily protection limit, the system automatically marked the account as breached.',
    }
  }
  if (normalized === 'MAX_DRAWDOWN') {
    return {
      title: 'Maximum Drawdown Breach',
      narrative: 'Your account equity fell below the maximum drawdown protection level calculated from your peak balance. This permanently breached the account according to the risk rules.',
    }
  }
  if (normalized === 'MIN_TRADE_DURATION') {
    return {
      title: 'Minimum Trade Duration Breach',
      narrative: 'The account breached the minimum trade duration rule after multiple trades were closed too quickly. This rule helps discourage prohibited scalping behavior.',
    }
  }
  if (normalized === 'HFT_BREACH') {
    return {
      title: 'High Frequency Trading Breach',
      narrative: 'The account triggered an HFT breach after more than 10 positions were closed within a rolling 1-minute window.',
    }
  }
  if (normalized === 'TIME_LIMIT') {
    return {
      title: 'Time Limit Breach',
      narrative: 'The account exceeded the allowed trading time window without meeting the required target. Once the expiry condition was reached, the account was marked as breached.',
    }
  }
  if (normalized === 'UNSUPPORTED_SYMBOL') {
    return {
      title: 'Unsupported Symbol Breach',
      narrative: 'The account traded an instrument outside the supported symbol list. That activity immediately caused the account to be breached.',
    }
  }
  return {
    title: 'Account Breach',
    narrative: 'Your account violated one of the program risk rules and was marked as breached. Please review the details below for the exact trigger and supporting metrics.',
  }
}

export const generateBreachReportPdfBuffer = async (payload: BreachReportPayload) => {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const regularFontBytes = await fs.readFile(REGULAR_FONT_PATH)
  const boldFontBytes = await fs.readFile(BOLD_FONT_PATH)
  const page = pdf.addPage([900, 1280])
  const font = await pdf.embedFont(regularFontBytes)
  const boldFont = await pdf.embedFont(boldFontBytes)

  page.drawRectangle({ x: 0, y: 0, width: 900, height: 1280, color: rgb(0.97, 0.98, 0.99) })
  page.drawRectangle({ x: 30, y: 30, width: 840, height: 1220, color: rgb(1, 1, 1) })
  page.drawRectangle({ x: 30, y: 1158, width: 840, height: 92, color: rgb(0.06, 0.16, 0.27) })
  page.drawRectangle({ x: 30, y: 1148, width: 840, height: 6, color: rgb(0.95, 0.65, 0.2) })

  const logoBytes = await fetchLogoBytes()
  if (logoBytes) {
    const logoImage = isPng(logoBytes) ? await pdf.embedPng(logoBytes) : await pdf.embedJpg(logoBytes)
    page.drawImage(logoImage, { x: 55, y: 1183, width: 48, height: 48 })
  }

  page.drawText('MACHEFUNDED', { x: 112, y: 1202, size: 22, font: boldFont, color: rgb(1, 1, 1) })
  page.drawText('Breach Report', { x: 705, y: 1202, size: 18, font: boldFont, color: rgb(1, 1, 1) })

  let y = 1108
  const drawMeta = (label: string, value: string) => {
    page.drawText(`${label}:`, { x: 55, y, size: 11, font: boldFont, color: rgb(0.25, 0.29, 0.34) })
    page.drawText(value, { x: 145, y, size: 11, font, color: rgb(0.25, 0.29, 0.34) })
    y -= 18
  }

  drawMeta('Account', payload.accountNumber)
  drawMeta('Challenge ID', payload.challengeId)
  drawMeta('Trader', payload.traderName)
  drawMeta('Email', payload.traderEmail)
  drawMeta('Account Size', payload.accountSize)
  drawMeta('Phase', payload.phase)
  drawMeta('Challenge', payload.challengeType)
  drawMeta('Platform', payload.platform.toUpperCase())
  drawMeta('Status', payload.status)
  drawMeta('Generated', payload.generatedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))

  page.drawRectangle({ x: 50, y: 890, width: 800, height: 78, color: rgb(1, 0.96, 0.96), borderColor: rgb(0.92, 0.3, 0.3), borderWidth: 1 })
  page.drawRectangle({ x: 50, y: 890, width: 6, height: 78, color: rgb(0.92, 0.3, 0.3) })
  page.drawText(payload.breachReasonLabel, { x: 70, y: 940, size: 16, font: boldFont, color: rgb(0.65, 0.12, 0.12) })
  drawWrappedText(page, payload.breachNarrative, {
    x: 70,
    y: 918,
    maxWidth: 760,
    lineHeight: 14,
    size: 11,
    font,
    color: rgb(0.35, 0.18, 0.18),
  })

  page.drawText('Key Metrics', { x: 50, y: 855, size: 17, font: boldFont, color: rgb(0.14, 0.18, 0.22) })
  const metricItems = [
    ['Peak Balance', payload.peakBalance],
    ['Balance Before Trade', payload.balanceBeforeTrade],
    ['Equity at Breach', payload.equityAtBreach],
    ['Daily Limit', payload.dailyLimit ?? 'N/A'],
    ['Max DD Limit', payload.maxLimit ?? 'N/A'],
    ['Breach Time', payload.breachTimeLabel],
  ]
  metricItems.forEach(([label, value], index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    const cardX = 50 + (col * 255)
    const cardY = 775 - (row * 92)
    page.drawRectangle({ x: cardX, y: cardY, width: 235, height: 72, color: rgb(0.98, 0.99, 1), borderColor: rgb(0.91, 0.93, 0.96), borderWidth: 1 })
    page.drawText(String(label), { x: cardX + 14, y: cardY + 46, size: 10, font, color: rgb(0.48, 0.52, 0.58) })
    page.drawText(String(value), { x: cardX + 14, y: cardY + 24, size: 14, font: boldFont, color: rgb(0.16, 0.19, 0.23) })
  })

  page.drawText('Equity Movement & Breach Analysis', { x: 50, y: 500, size: 17, font: boldFont, color: rgb(0.14, 0.18, 0.22) })
  page.drawRectangle({ x: 50, y: 315, width: 800, height: 165, color: rgb(0.98, 0.99, 1), borderColor: rgb(0.91, 0.93, 0.96), borderWidth: 1 })
  if (payload.showEquityChart !== false) {
    drawGauge(page, {
      centerX: 220,
      centerY: 590,
      radius: 54,
      percent: Number.parseFloat(payload.dailyDrawdownUsageLabel?.replace(/[^0-9.]/g, '') || '0'),
      label: 'Daily Drawdown',
      valueLabel: payload.dailyDrawdownUsageLabel ?? 'N/A',
      accent: rgb(0.92, 0.3, 0.3),
      font,
      boldFont,
    })
    drawGauge(page, {
      centerX: 480,
      centerY: 590,
      radius: 54,
      percent: Number.parseFloat(payload.maxDrawdownUsageLabel?.replace(/[^0-9.]/g, '') || '0'),
      label: 'Max Drawdown Usage',
      valueLabel: payload.maxDrawdownUsageLabel ?? 'N/A',
      accent: rgb(0.13, 0.7, 0.39),
      font,
      boldFont,
    })

    page.drawLine({ start: { x: 80, y: 430 }, end: { x: 810, y: 430 }, thickness: 1, color: rgb(0.13, 0.77, 0.37) })
    page.drawLine({ start: { x: 80, y: 380 }, end: { x: 810, y: 380 }, thickness: 1, color: rgb(0.89, 0.2, 0.2) })
    page.drawText(payload.balanceLineLabel ?? `Balance: ${payload.balanceBeforeTrade}`, { x: 85, y: 436, size: 10, font: boldFont, color: rgb(0.13, 0.77, 0.37) })
    page.drawText(payload.limitLineLabel ?? `Limit: ${payload.dailyLimit ?? payload.maxLimit ?? 'N/A'}`, { x: 85, y: 386, size: 10, font: boldFont, color: rgb(0.89, 0.2, 0.2) })
    page.drawLine({ start: { x: 80, y: 430 }, end: { x: 220, y: 420 }, thickness: 2, color: rgb(0.94, 0.33, 0.33) })
    page.drawLine({ start: { x: 220, y: 420 }, end: { x: 360, y: 405 }, thickness: 2, color: rgb(0.94, 0.33, 0.33) })
    page.drawLine({ start: { x: 360, y: 405 }, end: { x: 520, y: 392 }, thickness: 2, color: rgb(0.94, 0.33, 0.33) })
    page.drawLine({ start: { x: 520, y: 392 }, end: { x: 650, y: 370 }, thickness: 2, color: rgb(0.94, 0.33, 0.33) })
    page.drawLine({ start: { x: 650, y: 370 }, end: { x: 780, y: 352 }, thickness: 2, color: rgb(0.94, 0.33, 0.33) })
    page.drawCircle({ x: 650, y: 370, size: 4, color: rgb(0.89, 0.2, 0.2) })
    page.drawText(payload.equityLineLabel ?? 'Equity line', { x: 680, y: 360, size: 10, font: boldFont, color: rgb(0.94, 0.33, 0.33) })
    page.drawText(payload.breachPointLabel ?? payload.equityAtBreach, { x: 640, y: 346, size: 10, font: boldFont, color: rgb(0.89, 0.2, 0.2) })
  } else {
    page.drawText('No equity curve is shown for this breach type. This report focuses on the exact rule violation details instead.', { x: 70, y: 396, size: 11, font, color: rgb(0.35, 0.18, 0.18) })
  }
  drawWrappedText(page, payload.analysisParagraph, {
    x: 60,
    y: 290,
    maxWidth: 780,
    lineHeight: 15,
    size: 11,
    font,
    color: rgb(0.28, 0.32, 0.36),
  })

  page.drawText('Open Positions at Breach', { x: 50, y: 220, size: 17, font: boldFont, color: rgb(0.14, 0.18, 0.22) })
  page.drawRectangle({ x: 50, y: 188, width: 800, height: 26, color: rgb(0.97, 0.98, 1) })
  const tableHeaders = ['Symbol', 'Ticket', 'Floating PnL', 'Time']
  const headerXs = [62, 220, 470, 690]
  tableHeaders.forEach((header, index) => {
    page.drawText(header, { x: headerXs[index]!, y: 197, size: 10, font: boldFont, color: rgb(0.35, 0.39, 0.44) })
  })
  const rows = payload.openPositions.length > 0
    ? payload.openPositions.slice(0, 6)
    : [{ symbol: 'N/A', ticket: '-', floatingPnl: 'No open positions recorded', time: '-' }]
  rows.forEach((row, index) => {
    const rowY = 166 - (index * 24)
    page.drawLine({ start: { x: 50, y: rowY - 6 }, end: { x: 850, y: rowY - 6 }, thickness: 0.6, color: rgb(0.92, 0.93, 0.95) })
    page.drawText(row.symbol, { x: 62, y: rowY, size: 10, font, color: rgb(0.18, 0.21, 0.25) })
    page.drawText(row.ticket, { x: 220, y: rowY, size: 10, font, color: rgb(0.18, 0.21, 0.25) })
    page.drawText(row.floatingPnl, { x: 470, y: rowY, size: 10, font, color: rgb(0.8, 0.23, 0.23) })
    page.drawText(row.time, { x: 690, y: rowY, size: 10, font, color: rgb(0.18, 0.21, 0.25) })
  })

  if (payload.earlyClosedTrades && payload.earlyClosedTrades.length > 0) {
    page.drawText('Early Closed Trades That Triggered Breach', { x: 50, y: 132, size: 15, font: boldFont, color: rgb(0.14, 0.18, 0.22) })
    payload.earlyClosedTrades.slice(0, 3).forEach((row, index) => {
      const yBase = 110 - (index * 20)
      page.drawText(`${row.symbol} • Deal ${row.dealId} • Duration ${row.duration} • Closed ${row.closedAt}`, {
        x: 60,
        y: yBase,
        size: 9.5,
        font,
        color: rgb(0.3, 0.34, 0.39),
      })
    })
  }

  page.drawText('Risk Guidance', { x: 50, y: 58, size: 15, font: boldFont, color: rgb(0.14, 0.18, 0.22) })
  payload.guidance.slice(0, 4).forEach((item, index) => {
    page.drawCircle({ x: 60, y: 36 - (index * 14), size: 2.3, color: rgb(0.18, 0.22, 0.27) })
    page.drawText(item, { x: 70, y: 32 - (index * 14), size: 9.5, font, color: rgb(0.3, 0.34, 0.39) })
  })

  return Buffer.from(await pdf.save())
}

const resolveOutputDir = () => path.join(process.cwd(), 'outputs', 'breach-report-previews')

export const writeBreachReportPreview = async (filename: string, payload: BreachReportPayload) => {
  const dir = resolveOutputDir()
  await fs.mkdir(dir, { recursive: true })
  const buffer = await generateBreachReportPdfBuffer(payload)
  const outputPath = path.join(dir, filename)
  await fs.writeFile(outputPath, buffer)
  return outputPath
}

const buildBreachReportKey = (userId: number, relatedEntityId: string) =>
  `${BREACH_REPORT_BUCKET_PREFIX}/${userId}/breach-report-${relatedEntityId}.pdf`

export const getOrCreateBreachReport = async (payload: {
  userId: number
  accountId: number
  challengeId: string
  report: BreachReportPayload
}) => {
  const relatedEntityId = payload.challengeId || String(payload.accountId)
  const existing = await prisma.certificate.findFirst({
    where: {
      userId: payload.userId,
      type: 'breach_report',
      relatedEntityId,
    },
  })
  if (existing) return existing

  const buffer = await generateBreachReportPdfBuffer(payload.report)
  const key = buildBreachReportKey(payload.userId, relatedEntityId)
  const { publicUrl } = await uploadBufferToR2({
    key,
    contentType: 'application/pdf',
    body: buffer,
  })

  return prisma.certificate.create({
    data: {
      userId: payload.userId,
      type: 'breach_report',
      title: 'Breach Report',
      description: 'Official breach report for a breached account.',
      certificateUrl: publicUrl,
      generatedAt: new Date(),
      relatedEntityId,
      metadata: {
        account_id: payload.accountId,
        challenge_id: payload.challengeId,
        account_number: payload.report.accountNumber,
        breach_reason: payload.report.breachReason,
      },
    },
  })
}
