import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../../common/errors'
import { prisma } from '../../config/prisma'

export const checkEmailExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = String(req.query.email ?? '').trim()
    if (!email) {
      throw new ApiError('Email is required', 400)
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError('Invalid email format', 400)
    }

    const lowerEmail = email.toLowerCase()
    const exists = await prisma.user.findFirst({
      where: { email: lowerEmail },
      select: { id: true },
    })
    res.json({ exists })
  } catch (err) {
    next(err as Error)
  }
}