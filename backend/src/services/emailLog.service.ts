import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'

type EmailLogPayload = {
  type: string
  accountId?: number | null
  userId?: number | null
  metadata?: Prisma.InputJsonValue | null
}

type ShouldSendEmailPayload = EmailLogPayload & {
  send: () => Promise<void>
}

export const recordEmailLog = async ({ type, accountId, userId, metadata }: EmailLogPayload) => {
  const data: Prisma.EmailLogUncheckedCreateInput = {
    type,
    accountId: accountId ?? null,
    userId: userId ?? null,
    ...(metadata != null ? { metadata } : {}),
  }
  await prisma.emailLog.create({ data })
}

export const hasRecentEmailLog = async ({ type, accountId, userId }: EmailLogPayload) => {
  const existing = await prisma.emailLog.findFirst({
    where: {
      type,
      ...(accountId != null ? { accountId } : {}),
      ...(userId != null ? { userId } : {}),
    },
  })
  return Boolean(existing)
}

export const sendEmailOnce = async ({ type, accountId, userId, send }: ShouldSendEmailPayload) => {
  const normalizedAccountId = accountId ?? null
  const normalizedUserId = userId ?? null
  const alreadySent = await hasRecentEmailLog({
    type,
    accountId: normalizedAccountId,
    userId: normalizedUserId,
  })
  if (alreadySent) return false
  await send()
  await recordEmailLog({ type, accountId: normalizedAccountId, userId: normalizedUserId })
  return true
}

export const recordCredentialView = async ({
  accountId,
  userId,
  metadata,
}: {
  accountId?: number | null
  userId?: number | null
  metadata?: Prisma.InputJsonValue | null
}) => recordEmailLog({
  type: 'CREDENTIAL_VIEW',
  accountId: accountId ?? null,
  userId: userId ?? null,
  ...(metadata != null ? { metadata } : {}),
})
