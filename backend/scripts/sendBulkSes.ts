import fs from 'fs'
import path from 'path'
import readline from 'readline'
import dotenv from 'dotenv'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
const SUBJECT = 'COME AND SEE - 50% DISCOUNT TO TRY US'

const HTML_BODY = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>COME AND SEE - 50% DISCOUNT TO TRY US</title>
</head>
<body style="margin:0; padding:0; background:#071f24; font-family:Arial, sans-serif; color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#071f24; padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:90%; background:#0b2b31; border-radius:18px; overflow:hidden;">
          <tr>
            <td style="padding:30px; text-align:center;">
              <img
                src="https://pub-e47c37a6a0b447288c2210b9e8f6faf5.r2.dev/login-page-logo.png"
                width="72"
                alt="MACHEFUNDED"
                style="display:block; margin:0 auto 14px;"
              />
              <h2 style="margin:0; color:#ffffff; letter-spacing:2px;">MACHEFUNDED</h2>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 35px 25px; text-align:center;">
              <p style="color:#6ee7f2; font-size:14px; letter-spacing:4px; margin:0 0 15px;">
                LIMITED OFFER
              </p>

              <h1 style="font-size:42px; line-height:1.1; margin:0; color:#ffffff;">
                COME AND SEE
              </h1>

              <p style="font-size:18px; line-height:1.6; color:#d7e8eb; margin:25px 0 0;">
                Get <strong style="color:#6ee7f2;">50% OFF</strong> on all NGN Flexi and NGN Standard accounts.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 35px 0; text-align:left;">
              <p style="font-size:16px; line-height:1.7; color:#d7e8eb; margin:0;">
                Dear Trader,
              </p>
              <p style="font-size:16px; line-height:1.7; color:#d7e8eb; margin:16px 0 0;">
                It’s actually very easy to know if a prop firm truly offers a good service or not.
              </p>
              <p style="font-size:16px; line-height:1.7; color:#d7e8eb; margin:16px 0 0;">
                Just join their community and observe how existing customers are treated.
              </p>
              <p style="font-size:16px; line-height:1.7; color:#d7e8eb; margin:16px 0 0;">
                At MACHEFUNDED, we encourage you to do exactly that.
              </p>
              <p style="font-size:16px; line-height:1.7; color:#d7e8eb; margin:16px 0 0;">
                Join our Discord community, interact with traders, watch the conversations, see payout proofs, support responses, trader experiences, and judge everything yourself before getting started.
              </p>
              <p style="font-size:16px; line-height:1.7; color:#d7e8eb; margin:16px 0 0;">
                Being a new prop firm does not mean we are not good.
              </p>
              <p style="font-size:16px; line-height:1.7; color:#d7e8eb; margin:16px 0 0;">
                In fact, we strongly believe we currently offer one of the best trading experiences among NGN prop firms.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:25px 35px 10px;">
              <h2 style="font-size:28px; margin:0 0 18px; color:#ffffff; text-align:center;">
                Why traders love MACHEFUNDED
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#082126; padding:16px 18px; border-radius:12px; color:#d7e8eb; font-size:15px; line-height:1.7;">
                    • Clean and easy-to-use dashboard/UI
                  </td>
                </tr>
                <tr><td height="10"></td></tr>
                <tr>
                  <td style="background:#082126; padding:16px 18px; border-radius:12px; color:#d7e8eb; font-size:15px; line-height:1.7;">
                    • Fully automated systems for smooth experience
                  </td>
                </tr>
                <tr><td height="10"></td></tr>
                <tr>
                  <td style="background:#082126; padding:16px 18px; border-radius:12px; color:#d7e8eb; font-size:15px; line-height:1.7;">
                    • Fast account processing
                  </td>
                </tr>
                <tr><td height="10"></td></tr>
                <tr>
                  <td style="background:#082126; padding:16px 18px; border-radius:12px; color:#d7e8eb; font-size:15px; line-height:1.7;">
                    • Responsive support that feels more like talking to a family member than a company
                  </td>
                </tr>
                <tr><td height="10"></td></tr>
                <tr>
                  <td style="background:#082126; padding:16px 18px; border-radius:12px; color:#d7e8eb; font-size:15px; line-height:1.7;">
                    • Transparent rules and active community
                  </td>
                </tr>
                <tr><td height="10"></td></tr>
                <tr>
                  <td style="background:#082126; padding:16px 18px; border-radius:12px; color:#d7e8eb; font-size:15px; line-height:1.7;">
                    • Built by traders, for traders
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:5px 35px 10px; text-align:left;">
              <p style="font-size:16px; line-height:1.7; color:#d7e8eb; margin:0;">
                We are focused on creating a modern prop firm experience that actually feels stress-free and enjoyable for traders.
              </p>
              <p style="font-size:16px; line-height:1.7; color:#d7e8eb; margin:16px 0 0;">
                And to give you a reason to finally try our service…
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 35px; text-align:center;">
              <div style="background:#082126; border-radius:16px; padding:24px 20px;">
                <p style="font-size:24px; line-height:1.4; color:#6ee7f2; margin:0 0 16px; font-weight:bold;">
                  🔥 CRAZY LIMITED OFFER 🔥
                </p>
                <p style="font-size:18px; line-height:1.7; color:#ffffff; margin:0;">
                  Get <strong style="color:#6ee7f2;">50% OFF</strong> on <strong>ALL NGN FLEXI</strong> and <strong>NGN STANDARD</strong> accounts.
                </p>
                <p style="font-size:20px; line-height:1.6; color:#ffffff; margin:18px 0 0;">
                  Use Code: <strong style="color:#6ee7f2; letter-spacing:1px;">COMEANDSEE</strong>
                </p>
                <p style="font-size:16px; line-height:1.6; color:#ffcf70; margin:18px 0 0; font-weight:bold;">
                  ⏳ Offer ends tomorrow.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 35px 0; text-align:left;">
              <p style="font-size:16px; line-height:1.7; color:#d7e8eb; margin:0;">
                We would love to have you in the community.
              </p>
              <p style="font-size:16px; line-height:1.7; color:#d7e8eb; margin:16px 0 0;">
                See you inside.
              </p>
              <p style="font-size:16px; line-height:1.7; color:#d7e8eb; margin:16px 0 0;">
                — Team MACHEFUNDED
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:25px 35px; text-align:center;">
              <a href="https://discord.gg/93trVSkjcf" style="display:inline-block; background:#0ea5ad; color:#ffffff; text-decoration:none; padding:16px 32px; border-radius:50px; font-size:16px; font-weight:bold;">
                Join Our Discord Community
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 35px 20px; text-align:center;">
              <p style="font-size:13px; color:#9fbabe; line-height:1.6; margin:0; background:#082126; padding:14px 16px; border-radius:12px;">
                If you no longer want to receive emails, reply with "unsubscribe".
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 35px 35px; text-align:center;">
              <p style="font-size:14px; color:#9fbabe; line-height:1.6; margin:0;">
                Trade smart. Build your score. Get rewarded.
              </p>
              <p style="font-size:13px; color:#6f8f94; margin-top:18px;">
                © MACHEFUNDED. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

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