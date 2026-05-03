import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'
import { resolveAccountName } from '../../services/safehaven.service'
import { buildCacheKey, clearCacheByPrefix } from '../../common/cache'
import { createSignedUploadUrl, uploadBufferToR2 } from '../../services/r2.service'
import { SAFEHAVEN_BANKS } from './kyc.banks'
import type { AuthenticatedRequest } from '../../common/auth'

const ensureUser = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }
  return req.user
}

const ACTIVE_KYC_STATUSES = ['pending', 'in_review', 'processing', 'submitted', 'approved', 'verified']

const normalizeNameTokens = (value?: string | null) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .map((part) => part.trim())
  .filter((part) => part.length >= 2)

const hasAtLeastOneNameMatch = (savedName?: string | null, resolvedName?: string | null) => {
  const savedTokens = normalizeNameTokens(savedName)
  const resolvedTokens = new Set(normalizeNameTokens(resolvedName))
  return savedTokens.some((token) => resolvedTokens.has(token))
}

const assertNoActiveOrApprovedKycForUser = async (userId: number) => {
  const existing = await prisma.kycRequest.findFirst({
    where: {
      userId,
      status: { in: ACTIVE_KYC_STATUSES },
    },
    orderBy: { submittedAt: 'desc' },
  })

  if (!existing) {
    return
  }

  const normalizedStatus = existing.status.toLowerCase()
  if (normalizedStatus === 'approved' || normalizedStatus === 'verified') {
    throw new ApiError('Your KYC has already been approved.', 409)
  }

  throw new ApiError('You already have a KYC request in progress.', 409)
}

const assertDocumentKycUnique = async (userId: number, documentType: string, documentNumber: string) => {
  const existing = await prisma.kycRequest.findFirst({
    where: {
      userId: { not: userId },
      documentType,
      documentNumber,
      status: { in: ACTIVE_KYC_STATUSES },
    },
  })

  if (existing) {
    throw new ApiError('This KYC document is already in use by another account.', 409)
  }
}

const assertBankKycUnique = async (userId: number, bankCode: string, bankAccountNumber: string) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      id: { not: userId },
      payoutBankCode: bankCode,
      payoutAccountNumber: bankAccountNumber,
      kycStatus: { in: ACTIVE_KYC_STATUSES, mode: 'insensitive' },
    },
  })

  if (existingUser) {
    throw new ApiError('This bank account is already linked to another verified or pending KYC profile.', 409)
  }
}

const countKycEligibleAccounts = async (userId: number) => prisma.cTraderAccount.count({
  where: {
    userId,
    accessStatus: 'granted',
    OR: [
      {
        AND: [
          { challengeType: 'breezy' },
          { status: { in: ['active', 'breached'], mode: 'insensitive' } },
        ],
      },
      { status: 'funded' },
      { phase: { contains: 'funded', mode: 'insensitive' } },
      { challengeType: 'instant_funded' },
    ],
  },
})

const toBankPayload = (bank: typeof SAFEHAVEN_BANKS[number]) => ({
  bank_code: bank.bankCode,
  bank_name: bank.name,
  routing_key: bank.routingKey,
  logo_image: bank.logoImage,
})

export const listBanks = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ banks: SAFEHAVEN_BANKS.map(toBankPayload) })
  } catch (err) {
    next(err as Error)
  }
}

export const resolveBankAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { bank_code, bank_account_number } = req.body as {
      bank_code?: string
      bank_account_number?: string
    }

    if (!bank_code || !bank_account_number) {
      throw new ApiError('bank_code and bank_account_number are required', 400)
    }

    const safehavenResponse = await resolveAccountName({
      bankCode: bank_code,
      accountNumber: bank_account_number,
    })

    const accountName = safehavenResponse.data?.accountName
    if (!accountName) {
      throw new ApiError(safehavenResponse.message || 'Unable to resolve account name', 400)
    }

    const now = new Date()
    await prisma.user.update({
      where: { id: user.id },
      data: {
        payoutMethodType: 'bank_transfer',
        payoutBankCode: bank_code,
        payoutAccountNumber: bank_account_number,
        payoutAccountName: accountName,
        payoutSafeHavenReference: safehavenResponse.data?.reference ?? null,
        payoutSafeHavenPayload: safehavenResponse as any,
        payoutVerifiedAt: now,
        payoutUpdatedAt: now,
      },
    })

    await clearCacheByPrefix(buildCacheKey(['trader', 'me', user.id]))
    await clearCacheByPrefix(buildCacheKey(['payouts', 'summary', user.id]))

    res.json({
      bank_code,
      bank_account_number,
      account_name: accountName,
      safehaven: safehavenResponse,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const saveCryptoPayout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { crypto_currency, crypto_address } = req.body as {
      crypto_currency?: string
      crypto_address?: string
      first_name?: string
      last_name?: string
    }

    if (!crypto_currency || !crypto_address) {
      throw new ApiError('crypto_currency and crypto_address are required', 400)
    }
    if (!req.body.first_name || !req.body.last_name) {
      throw new ApiError('first_name and last_name are required for crypto payouts', 400)
    }

    const now = new Date()
    await prisma.user.update({
      where: { id: user.id },
      data: {
        payoutMethodType: 'crypto',
        payoutCryptoCurrency: crypto_currency.toUpperCase(),
        payoutCryptoAddress: crypto_address,
        payoutCryptoFirstName: req.body.first_name,
        payoutCryptoLastName: req.body.last_name,
        payoutUpdatedAt: now,
      },
    })

    await clearCacheByPrefix(buildCacheKey(['trader', 'me', user.id]))
    await clearCacheByPrefix(buildCacheKey(['payouts', 'summary', user.id]))

    res.json({
      crypto_currency: crypto_currency.toUpperCase(),
      crypto_address,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const fetchKycEligibility = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const fundedActive = await countKycEligibleAccounts(user.id)

    if (fundedActive < 1) {
      return res.json({
        eligible: false,
        message: 'You need at least one funded or active Breezy account before KYC becomes available.',
      })
    }

    return res.json({
      eligible: true,
      message: 'Eligible for KYC submission.',
    })
  } catch (err) {
    next(err as Error)
  }
}

export const submitKyc = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { document_type, document_number, id_front_url, id_back_url, selfie_url } = req.body as {
      document_type?: string
      document_number?: string
      id_front_url?: string
      id_back_url?: string | null
      selfie_url?: string | null
    }

    if (!document_type || !document_number || !id_front_url) {
      throw new ApiError('document_type, document_number, and id_front_url are required', 400)
    }

    const eligibility = await countKycEligibleAccounts(user.id)
    if (eligibility < 1) {
      throw new ApiError('You need at least one funded or active Breezy account before KYC becomes available.', 403)
    }

    await assertNoActiveOrApprovedKycForUser(user.id)
    await assertDocumentKycUnique(user.id, document_type, document_number)

    await prisma.user.update({
      where: { id: user.id },
      data: { kycStatus: 'pending' },
    })

    await clearCacheByPrefix(buildCacheKey(['trader', 'me', user.id]))

    const requestRecord = await prisma.kycRequest.create({
      data: {
        userId: user.id,
        documentType: document_type,
        documentNumber: document_number,
        idFrontUrl: id_front_url,
        idBackUrl: id_back_url ?? null,
        selfieUrl: selfie_url ?? null,
        status: 'pending',
      },
    })

    res.json({
      status: 'success',
      message: 'KYC submitted successfully',
      kyc_status: 'pending',
      request_id: requestRecord.id,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const submitBankKyc = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { bank_code, bank_account_number } = req.body as {
      bank_code?: string
      bank_account_number?: string
    }

    if (!bank_code || !bank_account_number) {
      throw new ApiError('bank_code and bank_account_number are required', 400)
    }

    const eligibility = await countKycEligibleAccounts(user.id)
    if (eligibility < 1) {
      throw new ApiError('You need at least one funded or active Breezy account before KYC becomes available.', 403)
    }

    await assertNoActiveOrApprovedKycForUser(user.id)

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      throw new ApiError('User not found', 404)
    }

    if (!dbUser.fullName?.trim()) {
      throw new ApiError('Please set your full name in Settings before using bank KYC verification.', 400)
    }

    const safehavenResponse = await resolveAccountName({
      bankCode: bank_code,
      accountNumber: bank_account_number,
    })

    const accountName = safehavenResponse.data?.accountName
    if (!accountName) {
      throw new ApiError(safehavenResponse.message || 'Unable to resolve account name', 400)
    }

    if (!hasAtLeastOneNameMatch(dbUser.fullName, accountName)) {
      throw new ApiError('Bank account name does not match your saved profile name. Update your name in Settings or use a matching account.', 400)
    }

    await assertBankKycUnique(user.id, bank_code, bank_account_number)

    const now = new Date()

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          payoutMethodType: 'bank_transfer',
          payoutBankCode: bank_code,
          payoutAccountNumber: bank_account_number,
          payoutAccountName: accountName,
          payoutSafeHavenReference: safehavenResponse.data?.reference ?? null,
          payoutSafeHavenPayload: safehavenResponse as any,
          payoutVerifiedAt: now,
          payoutUpdatedAt: now,
          kycStatus: 'approved',
        },
      })

      await tx.kycRequest.create({
        data: {
          userId: user.id,
          documentType: 'bank_verification',
          documentNumber: bank_account_number,
          idFrontUrl: 'bank_verification',
          idBackUrl: null,
          selfieUrl: null,
          status: 'approved',
          submittedAt: now,
          reviewedAt: now,
          reviewedBy: 'system_bank_verification',
        },
      })
    })

    await clearCacheByPrefix(buildCacheKey(['trader', 'me', user.id]))
    await clearCacheByPrefix(buildCacheKey(['payouts', 'summary', user.id]))

    res.json({
      status: 'success',
      message: 'Bank KYC approved successfully.',
      kyc_status: 'approved',
      bank_code,
      bank_account_number,
      account_name: accountName,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const createKycUploadUrl = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { filename, content_type, document_side } = req.body as {
      filename?: string
      content_type?: string
      document_side?: 'front' | 'back' | 'selfie'
    }

    if (!filename || !content_type || !document_side) {
      throw new ApiError('filename, content_type, and document_side are required', 400)
    }

    const safeFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `kyc/${user.id}/${document_side}/${Date.now()}-${safeFileName}`

    const signed = await createSignedUploadUrl({ key, contentType: content_type })

    res.json({
      upload_url: signed.uploadUrl,
      public_url: signed.publicUrl,
      key: signed.key,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const uploadKycDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const { filename, content_type, document_side, file_base64 } = req.body as {
      filename?: string
      content_type?: string
      document_side?: 'front' | 'back' | 'selfie'
      file_base64?: string
    }

    if (!filename || !content_type || !document_side || !file_base64) {
      throw new ApiError('filename, content_type, document_side, and file_base64 are required', 400)
    }

    const safeFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `kyc/${user.id}/${document_side}/${Date.now()}-${safeFileName}`

    const body = Buffer.from(file_base64, 'base64')
    const uploaded = await uploadBufferToR2({
      key,
      contentType: content_type,
      body,
    })

    res.json({
      public_url: uploaded.publicUrl,
      key: uploaded.key,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listKycHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req)
    const requests = await prisma.kycRequest.findMany({
      where: { userId: user.id },
      orderBy: { submittedAt: 'desc' },
    })

    res.json({
      requests: requests.map((item) => ({
        id: item.id,
        status: item.status,
        document_type: item.documentType,
        document_number: item.documentNumber,
        id_front_url: item.idFrontUrl,
        id_back_url: item.idBackUrl,
        selfie_url: item.selfieUrl,
        submitted_at: item.submittedAt,
        reviewed_at: item.reviewedAt,
        reviewed_by: item.reviewedBy,
        decline_reason: item.declineReason,
      })),
    })
  } catch (err) {
    next(err as Error)
  }
}