import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses'
import { env } from '../config/env'
import { buildEmailTemplate } from './emailTemplate'

export type EmailPayload = {
  to: string
  subject: string
  title: string
  subtitle: string
  content: string
  buttonText: string
  buttonLink?: string
  infoBox: string
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>
}

const resolveButtonLink = (override?: string) => override ?? env.sesDashboardUrl

const resolveSender = () => {
  const fromEmail = env.sesFromEmail
  if (!fromEmail) return ''
  return env.sesFromName ? `${env.sesFromName} <${fromEmail}>` : fromEmail
}

const buildRawEmail = (payload: {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  from: string
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>
}) => {
  const boundary = `BOUNDARY_${Date.now()}`
  const headerLines = [
    `From: ${payload.from}`,
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ]

  if (payload.replyTo) {
    headerLines.push(`Reply-To: ${payload.replyTo}`)
  }

  const bodyLines = [
    `--${boundary}`,
    'Content-Type: multipart/alternative; boundary="ALT_BOUNDARY"',
    '',
    '--ALT_BOUNDARY',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    payload.text,
    '',
    '--ALT_BOUNDARY',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    payload.html,
    '',
    '--ALT_BOUNDARY--',
  ]

  const attachmentLines = (payload.attachments ?? []).flatMap((attachment) => [
    `--${boundary}`,
    `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachment.filename}"`,
    '',
    attachment.content.toString('base64'),
    '',
  ])

  const ending = `--${boundary}--`

  return [...headerLines, '', ...bodyLines, ...attachmentLines, ending].join('\r\n')
}

export const fetchRemoteAttachment = async (payload: {
  url: string
  filename: string
  contentType?: string
}) => {
  const response = await fetch(payload.url)
  if (!response.ok) {
    throw new Error(`Failed to fetch attachment (${response.status}) from ${payload.url}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  return {
    filename: payload.filename,
    content: buffer,
    ...(payload.contentType ? { contentType: payload.contentType } : {}),
  }
}

export const sendUnifiedEmail = async (payload: EmailPayload) => {
  if (!env.sesAccessKeyId || !env.sesSecretAccessKey || !env.sesFromEmail) {
    console.warn('[email] AWS SES credentials or from email not configured')
    return null
  }
  const html = buildEmailTemplate({
    title: payload.title,
    subtitle: payload.subtitle,
    content: payload.content,
    buttonText: payload.buttonText,
    buttonLink: resolveButtonLink(payload.buttonLink),
    infoBox: payload.infoBox,
  })


  const attachments = payload.attachments?.map((attachment) => ({
    filename: attachment.filename,
    content: attachment.content,
    contentType: attachment.contentType ?? 'application/pdf',
  }))

  const client = new SESClient({
    region: env.sesRegion,
    credentials: {
      accessKeyId: env.sesAccessKeyId,
      secretAccessKey: env.sesSecretAccessKey,
    },
  })

  const rawEmail = buildRawEmail({
    to: payload.to,
    subject: payload.subject,
    html,
    text: payload.content,
    from: resolveSender(),
    ...(env.sesReplyToEmail ? { replyTo: env.sesReplyToEmail } : {}),
    ...(attachments ? { attachments } : {}),
  })

  const command = new SendRawEmailCommand({
    RawMessage: { Data: Buffer.from(rawEmail) },
  })

  return client.send(command)
}