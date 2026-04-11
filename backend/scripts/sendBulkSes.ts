import fs from 'fs'
import path from 'path'
import readline from 'readline'
import dotenv from 'dotenv'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { buildEmailTemplate } from '../src/services/emailTemplate'

const SUBJECT = 'See How Plenty Plenty Nigerians Dey Join Us'

const HTML_BODY = buildEmailTemplate({
  title: 'See How Plenty Plenty Nigerians Dey Join Us',
  subtitle: 'More Nigerian traders are choosing MACHEFUNDED every day.',
  content: `
    <p>Hey Trader,</p>

    <p>
      See how plenty plenty Nigerian traders dey join us every day! 🇳🇬
    </p>
    <p>
      Over the past few weeks, something powerful has been happening…
    </p>
    <p>
      More traders across Nigeria are discovering a better way to get funded — and they’re choosing MACHEFUNDED.
    </p>
    <p>
      From beginners testing their first strategy…<br/>
      To experienced traders scaling aggressively…<br/>
      The traction we’re seeing right now is massive.
    </p>

    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 20px 0;" />

    <p>
      And it’s not just talk 👇
    </p>
    <ul>
      <li>✅ We processed payouts for over 300 Nigerian traders in just 1 week</li>
      <li>✅ Fast executions, smooth dashboard, reliable systems</li>
      <li>✅ No unnecessary stress — just trade, pass, and get paid</li>
    </ul>

    <p>
      Now here’s where it gets interesting 👇🔥
    </p>
    <p>
      We’re dropping MULTIPLE DISCOUNTS so everyone can get in:
    </p>
    <ul>
      <li>🎁 FREE N200,000 ACCOUNTS (5 slots only) — Use code: <strong>MACHEFREE</strong></li>
      <li>🔥 80% OFF (ONLY 5 PEOPLE) — First come, first served</li>
      <li>⚡ 50% OFF — code: <strong>NAIJA50</strong> (ONLY 50 PEOPLE)</li>
      <li>⚡ 30% OFF — code: <strong>NAIJA30</strong> (ONLY 30 PEOPLE)</li>
      <li>⚡ 20% OFF — code: <strong>NAIJA20</strong> - VALID till 13/04/2026</li>
    </ul>

    <p>
      This is your chance to enter at the level you want — whether FREE or heavily discounted.
    </p>
    <p>
      👉 Get started now: <a href="https://machefunded.com">https://machefunded.com</a>
    </p>

    <p>
      Don’t wait… once these slots are gone, they’re gone.
    </p>
    <p>
      Momentum is building fast — get in early and secure your spot.
    </p>
    <p>
      Let’s get you funded.
    </p>
    <p>
      — Team MACHEFUNDED
    </p>
  `,
  buttonText: 'Visit MacheFunded',
  buttonLink: 'https://machefunded.com',
  infoBox: 'If you no longer want to receive emails, reply with "unsubscribe".',
})

type CliOptions = {
  filePath: string
  ratePerSecond: number
  batchLimit: number | null
  testEmail: string | null
}

const loadEnv = () => {
  const envPath = path.resolve(__dirname, '../.env')
  dotenv.config({ path: envPath })
}

const getArgValue = (key: string) => {
  const prefix = `${key}=`
  const raw = process.argv.find((arg) => arg.startsWith(prefix))
  return raw ? raw.slice(prefix.length) : null
}

const parseArgs = (): CliOptions => {
  const fileArg = getArgValue('--file')
  const rateArg = getArgValue('--rate')
  const limitArg = getArgValue('--limit')
  const testArg = getArgValue('--test')

  return {
    filePath: fileArg ? fileArg : 'users_emails.csv',
    ratePerSecond: rateArg ? Math.max(1, Number(rateArg)) : 10,
    batchLimit: limitArg ? Math.max(1, Number(limitArg)) : null,
    testEmail: testArg ? testArg : null,
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const loadSentEmails = (sentLogPath: string) => {
  if (!fs.existsSync(sentLogPath)) return new Set<string>()
  const lines = fs.readFileSync(sentLogPath, 'utf-8').split(/\r?\n/).filter(Boolean)
  return new Set(lines)
}

const readEmails = async (filePath: string) => {
  const emails: string[] = []
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })

  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const [first] = trimmed.split(',')
    const email = first ? first.trim() : ''
    if (email) emails.push(email)
  }

  return emails
}

const buildSesClient = () => {
  const region = process.env.AWS_SES_REGION
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing AWS_SES_REGION/AWS_SES_ACCESS_KEY_ID/AWS_SES_SECRET_ACCESS_KEY in .env')
  }

  return new SESClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

const sendEmail = async (ses: SESClient, toAddress: string) => {
  const fromEmail = process.env.AWS_SES_FROM_EMAIL
  const fromName = process.env.AWS_SES_FROM_NAME
  const replyTo = process.env.AWS_SES_REPLY_TO_EMAIL
  if (!fromEmail) {
    throw new Error('Missing AWS_SES_FROM_EMAIL in .env')
  }

  const source = fromName ? `${fromName} <${fromEmail}>` : fromEmail

  const command = new SendEmailCommand({
    Source: source,
    Destination: { ToAddresses: [toAddress] },
    Message: {
      Subject: { Data: SUBJECT, Charset: 'UTF-8' },
      Body: {
        Html: { Data: HTML_BODY, Charset: 'UTF-8' },
      },
    },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
  })

  await ses.send(command)
}

const main = async () => {
  loadEnv()
  const options = parseArgs()

  const baseDir = path.resolve(__dirname, '..')
  const filePath = path.isAbsolute(options.filePath)
    ? options.filePath
    : path.resolve(baseDir, options.filePath)

  const logsDir = path.resolve(baseDir, 'outputs', 'bulk-email')
  ensureDir(logsDir)

  const sentLogPath = path.resolve(logsDir, 'sent.log')
  const failedLogPath = path.resolve(logsDir, 'failed.log')
  const sentSet = loadSentEmails(sentLogPath)

  const ses = buildSesClient()

  if (options.testEmail) {
    await sendEmail(ses, options.testEmail)
    console.log(`✅ Test email sent to ${options.testEmail}`)
    return
  }

  const emails = await readEmails(filePath)
  const pending = emails.filter((email) => !sentSet.has(email))
  const limited = options.batchLimit ? pending.slice(0, options.batchLimit) : pending

  console.log(`Loaded ${emails.length} emails. Sending ${limited.length} (rate ${options.ratePerSecond}/sec).`)

  let success = 0
  let failed = 0

  for (let i = 0; i < limited.length; i += options.ratePerSecond) {
    const batch = limited.slice(i, i + options.ratePerSecond)
    await Promise.all(batch.map(async (email) => {
      try {
        await sendEmail(ses, email)
        fs.appendFileSync(sentLogPath, `${email}\n`)
        success += 1
        console.log(`✅ Sent ${email}`)
      } catch (error) {
        fs.appendFileSync(failedLogPath, `${email}\n`)
        failed += 1
        console.error(`❌ Failed ${email}`, error instanceof Error ? error.message : error)
      }
    }))

    if (i + options.ratePerSecond < limited.length) {
      await sleep(1000)
    }
  }

  console.log(`\nDONE: ${success} sent, ${failed} failed`)
  console.log(`Logs: ${sentLogPath} | ${failedLogPath}`)
}

main().catch((error) => {
  console.error('[sendBulkSes] Failed', error)
  process.exit(1)
})