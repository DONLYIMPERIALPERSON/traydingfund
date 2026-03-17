import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { ApiError } from '../../common/errors'

export const listAllowlist = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const admins = await prisma.adminAllowlist.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ admins })
  } catch (err) {
    next(err as Error)
  }
}

export const createAllowlistEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      full_name,
      role = 'admin',
      status = 'active',
      allowed_pages = [],
      require_mfa = false,
      can_assign_mt5 = false,
    } = req.body as {
      email: string
      full_name?: string
      role?: string
      status?: string
      allowed_pages?: string[]
      require_mfa?: boolean
      can_assign_mt5?: boolean
    }

    if (!email) {
      throw new ApiError('Email is required', 400)
    }

    const admin = await prisma.adminAllowlist.create({
      data: {
        email: email.toLowerCase(),
        fullName: full_name ?? null,
        role,
        status,
        allowedPages: allowed_pages,
        requireMfa: require_mfa,
        canAssignMt5: can_assign_mt5,
      },
    })

    res.status(201).json(admin)
  } catch (err) {
    next(err as Error)
  }
}

export const updateAllowlistEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) {
      throw new ApiError('Invalid admin id', 400)
    }

    const {
      full_name,
      role,
      status,
      allowed_pages,
      require_mfa,
      can_assign_mt5,
    } = req.body as {
      full_name?: string
      role?: string
      status?: string
      allowed_pages?: string[]
      require_mfa?: boolean
      can_assign_mt5?: boolean
    }

    const admin = await prisma.adminAllowlist.update({
      where: { id },
      data: {
        fullName: full_name,
        role,
        status,
        allowedPages: allowed_pages,
        requireMfa: require_mfa,
        canAssignMt5: can_assign_mt5,
      },
    })

    res.json(admin)
  } catch (err) {
    next(err as Error)
  }
}

export const deleteAllowlistEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) {
      throw new ApiError('Invalid admin id', 400)
    }

    await prisma.adminAllowlist.delete({ where: { id } })
    res.status(204).send()
  } catch (err) {
    next(err as Error)
  }
}