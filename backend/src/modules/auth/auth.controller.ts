import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../../config/supabaseAdmin'
import { ApiError } from '../../common/errors'

export const checkEmailExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = String(req.query.email ?? '').trim()
    if (!email) {
      throw new ApiError('Email is required', 400)
    }

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      email,
    })
    if (error) {
      throw new ApiError(error.message, 500)
    }

    const exists = (data?.users ?? []).length > 0
    res.json({ exists })
  } catch (err) {
    next(err as Error)
  }
}