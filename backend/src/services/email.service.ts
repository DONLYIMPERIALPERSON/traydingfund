import { Resend } from 'resend'
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

const resolveButtonLink = (override?: string) => override ?? env.resendDashboardUrl

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
    contentType: payload.contentType,
  }
}

export const sendUnifiedEmail = async (payload: EmailPayload) => {
  if (!env.resendApiKey || !env.resendFromEmail) {
    console.warn('[email] RESEND_API_KEY or RESEND_FROM_EMAIL not configured')
    return null
  }

  const resend = new Resend(env.resendApiKey)
  const html = buildEmailTemplate({
    title: payload.title,
    subtitle: payload.subtitle,
    content: payload.content,
    buttonText: payload.buttonText,
    buttonLink: resolveButtonLink(payload.buttonLink),
    infoBox: payload.infoBox,
  })

  return resend.emails.send({
    from: env.resendFromEmail,
    to: payload.to,
    subject: payload.subject,
    html,
    replyTo: env.resendReplyToEmail || undefined,
    attachments: payload.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType ?? 'application/pdf',
    })),
  })
}