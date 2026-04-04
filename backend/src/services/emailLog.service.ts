import { prisma } from '../config/prisma'

type EmailLogPayload = {
  type: string
  accountId?: number | null
  userId?: number | null
}

type ShouldSendEmailPayload = EmailLogPayload & {
  send: () => Promise<void>
}

export const recordEmailLog = async ({ type, accountId, userId }: EmailLogPayload) => {
  await prisma.emailLog.create({
    data: {
      type,
      accountId: accountId ?? null,
      userId: userId ?? null,
    },
  })
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
