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

const resolveButtonLink = (override?: string) => override ?? env.zeptoDashboardUrl

const resolveSender = () => {
  const fromEmail = env.zeptoFromEmail
  if (!fromEmail) return ''
  return env.zeptoFromName ? `${env.zeptoFromName} <${fromEmail}>` : fromEmail
}

type ZeptoAttachment = {
  name: string
  mime_type: string
  content: string
}

const buildZeptoPayload = (payload: EmailPayload) => {
  const htmlbody = buildEmailTemplate({
    title: payload.title,
    subtitle: payload.subtitle,
    content: payload.content,
    buttonText: payload.buttonText,
    buttonLink: resolveButtonLink(payload.buttonLink),
    infoBox: payload.infoBox,
  })

  const attachments: ZeptoAttachment[] | undefined = payload.attachments?.map((attachment) => ({
    name: attachment.filename,
    mime_type: attachment.contentType ?? 'application/octet-stream',
    content: attachment.content.toString('base64'),
  }))

  return {
    from: {
      address: env.zeptoFromEmail,
      name: env.zeptoFromName || 'MacheFunded',
    },
    to: [
      {
        email_address: {
          address: payload.to,
        },
      },
    ],
    subject: payload.subject,
    htmlbody,
    textbody: payload.content,
    ...(env.zeptoReplyToEmail
      ? {
          reply_to: [
            {
              address: env.zeptoReplyToEmail,
            },
          ],
        }
      : {}),
    ...(attachments?.length ? { attachments } : {}),
  }
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
  if (!env.zeptoToken || !env.zeptoFromEmail) {
    console.warn('[email] ZeptoMail token or from email not configured')
    return null
  }
  const response = await fetch(env.zeptoApiUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: env.zeptoToken,
    },
    body: JSON.stringify(buildZeptoPayload(payload)),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`ZeptoMail send failed (${response.status}): ${errorText}`)
  }

  return response.json().catch(() => ({ ok: true }))
}