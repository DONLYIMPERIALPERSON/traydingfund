import { prisma } from '../config/prisma'
import { Prisma, type Certificate, type User } from '@prisma/client'
import {
  generateRewardCertificateBuffer,
  generateOverallRewardCertificateBuffer,
  generateOnboardingCertificateBuffer,
  generatePassedChallengeCertificateBuffer,
} from './rewardCertificate.service'
import { uploadBufferToR2 } from './r2.service'

const CERTIFICATE_BUCKET_PREFIX = 'certificates'

const resolveCertificateName = (user: User) => {
  const prefersNickname = (user as { useNicknameForCertificates?: boolean }).useNicknameForCertificates ?? false
  const fullName = user.fullName?.trim()
  const nickname = user.nickName?.trim()
  const preferred = prefersNickname ? (nickname || fullName) : (fullName || nickname)
  return preferred || user.email
}

const buildCertificateKey = (type: string, userId: number, reference: string) => {
  const normalizedType = type.toLowerCase().replace(/\s+/g, '-')
  return `${CERTIFICATE_BUCKET_PREFIX}/${userId}/${normalizedType}-${reference}.png`
}

const ensureCertificateRecord = async (payload: {
  userId: number
  type: string
  title: string
  description?: string | null
  certificateUrl: string
  generatedAt: Date
  relatedEntityId?: string | null
  metadata?: Record<string, unknown> | null
}): Promise<Certificate> =>
  prisma.certificate.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      description: payload.description ?? null,
      certificateUrl: payload.certificateUrl,
      generatedAt: payload.generatedAt,
      relatedEntityId: payload.relatedEntityId ?? null,
      ...(payload.metadata ? { metadata: payload.metadata as Prisma.InputJsonValue } : {}),
    },
  })

const findExistingCertificate = async (payload: {
  userId: number
  type: string
  relatedEntityId?: string | null
}) => {
  if (!payload.relatedEntityId) return null
  return prisma.certificate.findFirst({
    where: {
      userId: payload.userId,
      type: payload.type,
      relatedEntityId: payload.relatedEntityId,
    },
  })
}

type GeneratedCertificatePayload = {
  userId: number
  type: string
  title: string
  description?: string | null
  relatedEntityId?: string | null
  metadata?: Record<string, unknown> | null
  buffer: Buffer
}

const uploadCertificateBuffer = async ({
  userId,
  type,
  relatedEntityId,
  buffer,
}: {
  userId: number
  type: string
  relatedEntityId?: string | null
  buffer: Buffer
}) => {
  const reference = relatedEntityId || `${Date.now()}`
  const key = buildCertificateKey(type, userId, reference)
  const { publicUrl } = await uploadBufferToR2({
    key,
    contentType: 'image/png',
    body: buffer,
  })
  return publicUrl
}

const createCertificateFromBuffer = async (payload: GeneratedCertificatePayload) => {
  const url = await uploadCertificateBuffer({
    userId: payload.userId,
    type: payload.type,
    ...(payload.relatedEntityId !== undefined ? { relatedEntityId: payload.relatedEntityId } : {}),
    buffer: payload.buffer,
  })
  return ensureCertificateRecord({
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    description: payload.description ?? null,
    certificateUrl: url,
    generatedAt: new Date(),
    relatedEntityId: payload.relatedEntityId ?? null,
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
  })
}

export const createOnboardingCertificate = async (payload: {
  userId: number
  orderId: number
  challengeType?: string | null
  phase?: string | null
  accountSize?: string | null
}) => {
  const existing = await findExistingCertificate({
    userId: payload.userId,
    type: 'onboarding',
    relatedEntityId: String(payload.orderId),
  })
  if (existing) return existing

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    throw new Error('User not found for certificate generation')
  }

  const name = resolveCertificateName(user)
  const buffer = await generateOnboardingCertificateBuffer({
    name,
    date: new Date(),
  })

  return createCertificateFromBuffer({
    userId: user.id,
    type: 'onboarding',
    title: 'Challenge Onboarding Certificate',
    description: 'Awarded for starting a new challenge.',
    relatedEntityId: String(payload.orderId),
    metadata: {
      challenge_type: payload.challengeType,
      phase: payload.phase,
      account_size: payload.accountSize,
    },
    buffer,
  })
}

export const createPassedChallengeCertificate = async (payload: {
  userId: number
  accountId: number
  challengeId?: string | null
  phase?: string | null
  challengeType?: string | null
  accountSize?: string | null
}) => {
  const relatedEntityId = payload.challengeId || String(payload.accountId)
  const existing = await findExistingCertificate({
    userId: payload.userId,
    type: 'passed_challenge',
    relatedEntityId,
  })
  if (existing) return existing

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    throw new Error('User not found for certificate generation')
  }

  const name = resolveCertificateName(user)
  const buffer = await generatePassedChallengeCertificateBuffer({
    name,
    date: new Date(),
  })

  return createCertificateFromBuffer({
    userId: user.id,
    type: 'passed_challenge',
    title: 'Challenge Passed Certificate',
    description: 'Awarded for passing to a funded challenge stage.',
    relatedEntityId,
    metadata: {
      account_id: payload.accountId,
      challenge_id: payload.challengeId,
      phase: payload.phase,
      challenge_type: payload.challengeType,
      account_size: payload.accountSize,
    },
    buffer,
  })
}

export const createPayoutCertificate = async (payload: {
  userId: number
  payoutId: number
  accountId?: number | null
  amount?: number | null
  currency?: string | null
}) => {
  const existing = await findExistingCertificate({
    userId: payload.userId,
    type: 'payout',
    relatedEntityId: String(payload.payoutId),
  })
  if (existing) return existing

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    throw new Error('User not found for certificate generation')
  }

  const name = resolveCertificateName(user)
  const normalizedCurrency = payload.currency?.toUpperCase() ?? 'USD'
  const rewardAmount = payload.amount ?? 0
  const rewardLabel = normalizedCurrency === 'NGN'
    ? `₦${rewardAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${rewardAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const buffer = await generateRewardCertificateBuffer({
    name,
    rewardLabel,
    date: new Date(),
  })

  return createCertificateFromBuffer({
    userId: user.id,
    type: 'payout',
    title: 'Payout Certificate',
    description: 'Issued for an approved payout.',
    relatedEntityId: String(payload.payoutId),
    metadata: {
      payout_id: payload.payoutId,
      account_id: payload.accountId,
      amount: payload.amount,
      currency: normalizedCurrency,
    },
    buffer,
  })
}

export const createOverallRewardCertificate = async (payload: {
  userId: number
  totalReward: number
  currency?: string | null
}): Promise<Certificate> => {
  const relatedEntityId = 'overall-reward'
  await prisma.certificate.deleteMany({
    where: {
      userId: payload.userId,
      type: 'overall_reward',
      relatedEntityId,
    },
  })

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    throw new Error('User not found for certificate generation')
  }

  const name = resolveCertificateName(user)
  const normalizedCurrency = payload.currency?.toUpperCase() ?? 'USD'
  const rewardLabel = normalizedCurrency === 'NGN'
    ? `₦${payload.totalReward.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${payload.totalReward.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const buffer = await generateOverallRewardCertificateBuffer({
    name,
    rewardLabel,
    date: new Date(),
  })

  return createCertificateFromBuffer({
    userId: user.id,
    type: 'overall_reward',
    title: 'Overall Reward Certificate',
    description: 'Issued for total rewards earned on MACHEFUNDED.',
    relatedEntityId,
    metadata: {
      total_reward: payload.totalReward,
      currency: normalizedCurrency,
    },
    buffer,
  })
}

export const listUserCertificates = async (userId: number) => {
  const certificates = await prisma.certificate.findMany({
    where: {
      userId,
      type: { not: 'breach_report' },
    },
    orderBy: { generatedAt: 'desc' },
  })

  return certificates.map((certificate) => ({
    id: certificate.id,
    certificate_type: certificate.type,
    title: certificate.title,
    description: certificate.description,
    certificate_url: certificate.certificateUrl,
    generated_at: certificate.generatedAt.toISOString(),
    related_entity_id: certificate.relatedEntityId,
    certificate_metadata: certificate.metadata ? JSON.stringify(certificate.metadata) : null,
  }))
}