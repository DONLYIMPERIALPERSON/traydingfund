import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'

export const listAdminKycProfiles = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const eligibleProfiles = await prisma.user.findMany({
      where: {
        cTraderAccounts: {
          some: {
            status: 'funded',
            accessStatus: 'granted',
          },
        },
      },
      include: {
        _count: { select: { cTraderAccounts: true } },
        cTraderAccounts: true,
      },
    })

    const profiles = eligibleProfiles.map((profile) => {
      const fundedAccounts = profile.cTraderAccounts.filter((account) => account.status === 'funded').length
      return {
        user_id: profile.id,
        name: profile.fullName ?? profile.email,
        email: profile.email,
        status: profile.kycStatus ?? 'pending',
        eligible_since: profile.createdAt,
        funded_accounts: fundedAccounts,
        total_challenge_accounts: profile._count.cTraderAccounts,
      }
    })

    res.json({
      profiles,
      stats: {
        eligible_profiles: profiles.length,
        today_eligible: profiles.filter((profile) => {
          const eligibleDate = profile.eligible_since ? new Date(profile.eligible_since) : null
          if (!eligibleDate) return false
          const now = new Date()
          return eligibleDate.toDateString() === now.toDateString()
        }).length,
      },
    })
  } catch (err) {
    next(err as Error)
  }
}

export const listAdminKycRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 20)
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.kycRequest.findMany({
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
        include: { user: true },
      }),
      prisma.kycRequest.count(),
    ])

    const pages = Math.max(1, Math.ceil(total / limit))

    res.json({
      requests: items.map((item) => ({
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
        user: {
          id: item.userId,
          name: item.user.fullName ?? item.user.email,
          email: item.user.email,
          payout_method_type: item.user.payoutMethodType,
          payout_bank_name: item.user.payoutBankName,
          payout_bank_code: item.user.payoutBankCode,
          payout_account_number: item.user.payoutAccountNumber,
          payout_account_name: item.user.payoutAccountName,
          payout_crypto_currency: item.user.payoutCryptoCurrency,
          payout_crypto_address: item.user.payoutCryptoAddress,
          payout_crypto_first_name: item.user.payoutCryptoFirstName,
          payout_crypto_last_name: item.user.payoutCryptoLastName,
          payout_verified_at: item.user.payoutVerifiedAt,
        },
      })),
      pagination: { page, limit, total, pages },
    })
  } catch (err) {
    next(err as Error)
  }
}

export const reviewKycRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestId = Number(req.params.id)
    const { action, decline_reason, admin_name } = req.body as {
      action?: 'approve' | 'decline'
      decline_reason?: string | null
      admin_name?: string | null
    }

    if (!requestId || !action) {
      throw new ApiError('id and action are required', 400)
    }

    const requestItem = await prisma.kycRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    })

    if (!requestItem) {
      throw new ApiError('KYC request not found', 404)
    }

    const now = new Date()
    const updatedStatus = action === 'approve' ? 'approved' : 'declined'

    const updated = await prisma.$transaction(async (tx) => {
      const requestUpdate = await tx.kycRequest.update({
        where: { id: requestId },
        data: {
          status: updatedStatus,
          reviewedAt: now,
          reviewedBy: admin_name ?? null,
          declineReason: action === 'decline' ? decline_reason ?? 'Declined by admin' : null,
        },
      })

      await tx.user.update({
        where: { id: requestItem.userId },
        data: { kycStatus: updatedStatus },
      })

      return requestUpdate
    })

    res.json({
      id: updated.id,
      status: updated.status,
      reviewed_at: updated.reviewedAt,
      reviewed_by: updated.reviewedBy,
      decline_reason: updated.declineReason,
      message: action === 'approve' ? 'KYC approved' : 'KYC declined',
    })
  } catch (err) {
    next(err as Error)
  }
}