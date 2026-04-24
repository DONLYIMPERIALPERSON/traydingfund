import fs from 'fs'
import path from 'path'
import readline from 'readline'
import dotenv from 'dotenv'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { buildEmailTemplate } from '../src/services/emailTemplate'

const SUBJECT = 'Withdraw Daily on Flexi - No Limits, No Caps'

const HTML_BODY = buildEmailTemplate({
  title: 'Withdraw Daily on Flexi - No Limits, No Caps',
  subtitle: 'Flexibility, speed, and full control over your earnings.',
  content: `
    <p>Dear Trader,</p>

    <p>
      Na everyday withdrawals dey happen here — and if you never believe, this is your sign to try am yourself.
    </p>

    <p>
      With our Flexi Accounts, you enjoy:
    </p>
    <ul>
      <li>Daily withdrawals — no waiting, no delays</li>
      <li>No profit cap — everything you earn is yours</li>
      <li>No daily drawdown limit — trade with more freedom</li>
      <li>No minimum trading days — pass and withdraw at your pace</li>
      <li>Fully automated system — fast, smooth experience from start to payout</li>
      <li>24/7 support — we’re always here when you need us</li>
    </ul>

    <p>
      <strong>Flexi Account Pricing:</strong>
    </p>
    <ul>
      <li>₦200,000 account — ₦9,000</li>
      <li>₦500,000 account — ₦21,000</li>
      <li>₦800,000 account — ₦31,500</li>
    </ul>

    <p>
      <strong>Standard Account Pricing:</strong>
    </p>
    <ul>
      <li>₦200,000 account — ₦5,000</li>
      <li>₦500,000 account — ₦11,500</li>
      <li>₦800,000 account — ₦17,000</li>
    </ul>

    <p>
      <strong>April Promo Codes:</strong>
    </p>
    <ul>
      <li>Use NGN26 — get 26% OFF NGN accounts</li>
      <li>Use USD16 — get 16% OFF USD accounts</li>
    </ul>

    <p>
      To allow you try our service with our improved system and new features, we’re doing something special:
    </p>
    <p>
      The first 50 users to use the promo code <strong>YES</strong> will get <strong>65% OFF</strong> on any NGN Flexi or Standard account.
    </p>
    <p>
      We built this for Nigerian traders who want flexibility, speed, and full control over their earnings.
    </p>
    <p>
      You can also join our community on Discord to stay updated with the latest updates, connect with other traders, and never miss important announcements:<br/>
      <a href="https://discord.gg/SXuDQc7g2">https://discord.gg/SXuDQc7g2</a>
    </p>
    <p>
      No long stories. No restrictions holding you back.
    </p>
    <p>
      Start today and experience it yourself.
    </p>
    <p>
      Best regards,<br/>
      MACHEFUNDED Team
    </p>
  `,
  buttonText: 'Start Today',
  buttonLink: 'https://www.machefunded.com',
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