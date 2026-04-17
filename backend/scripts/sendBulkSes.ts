import fs from 'fs'
import path from 'path'
import readline from 'readline'
import dotenv from 'dotenv'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { buildEmailTemplate } from '../src/services/emailTemplate'

const SUBJECT = '₦1,500 for a ₦200,000 Challenge — Limited Access'

const HTML_BODY = buildEmailTemplate({
  title: '₦1,500 for a ₦200,000 Challenge — Limited Access',
  subtitle: 'A simple and powerful way for Nigerian traders to get started.',
  content: `
    <p>Hello Trader,</p>

    <p>
      In trading, one principle always stands out — quality over everything.
    </p>
    <p>
      At Machefunded, we’ve built our systems around speed, reliability, and a seamless experience. From automated next-phase upgrades immediately after passing, to fast and responsive support, everything is designed to keep you focused on what truly matters — trading.
    </p>
    <p>
      This week alone, we paid out over $17,000 to Nigerian traders, reinforcing our commitment to consistency and trust.
    </p>
    <p>
      If you’re looking to get started or scale faster, now is the time. Our Attic Program gives Nigerian traders access to a ₦200,000 account for just ₦1,500 — a simple and powerful way to begin your journey with us.
    </p>
    <p>
      Explore the opportunity here: <a href="https://www.machefunded.com/attic-program">https://www.machefunded.com/attic-program</a>
    </p>
    <p>
      You can also join our growing community of traders on Discord to stay updated, connect, and learn:<br/>
      <a href="https://discord.gg/SXuDQc7g2">https://discord.gg/SXuDQc7g2</a>
    </p>
    <p>
      Trade with speed. Trade with confidence. Choose quality.
    </p>
    <p>
      Machefunded Team
    </p>
  `,
  buttonText: 'Explore Attic Program',
  buttonLink: 'https://www.machefunded.com/attic-program',
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