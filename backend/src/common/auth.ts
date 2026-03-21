import type { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'

import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { ApiError } from './errors'

const jwks = env.supabaseJwksUrl
  ? createRemoteJWKSet(new URL(env.supabaseJwksUrl), {
      headers: {
        apikey: env.supabaseServiceRoleKey,
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      },
    })
  : null

export type AuthUser = {
  id: number
  email: string
  role: string
}

export type AuthenticatedRequest = Request & { user?: AuthUser; supabaseSub?: string }

export const authenticate = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError('Missing bearer token', 401)
    }

    if (!jwks) {
      throw new ApiError('Supabase JWKS URL not configured', 500)
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${env.supabaseUrl}/auth/v1`,
      audience: 'authenticated',
    })

    const sub = payload.sub
    const email = payload.email as string | undefined
    if (!sub || !email) {
      throw new ApiError('Invalid auth token', 401)
    }

    const allowlist = await prisma.adminAllowlist.findUnique({
      where: { email: email.toLowerCase() },
    })

    const resolvedRole = allowlist?.status === 'active'
      ? allowlist.role
      : 'trader'

    const user = await prisma.user.upsert({
      where: { email },
      update: { email, role: resolvedRole },
      create: { email, role: resolvedRole, status: 'active' },
    })

    req.user = { id: user.id, email: user.email, role: user.role }
    req.supabaseSub = sub
    next()
  } catch (error) {
    console.error('Auth middleware failed:', error)
    const message = error instanceof Error ? error.message : 'Invalid auth token'
    const reason = (error as { code?: string; claim?: string })?.code
    if (reason === 'ERR_JWT_EXPIRED' || message.toLowerCase().includes('jwt') || message.toLowerCase().includes('token')) {
      return next(new ApiError('Invalid auth token', 401))
    }
    return next(error as Error)
  }
}

export const requireRole = (role: string | string[]) => {
  const allowed = Array.isArray(role) ? role : [role]
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError('Unauthorized', 401))
    }
    if (!allowed.includes(req.user.role)) {
      return next(new ApiError('Forbidden', 403))
    }
    return next()
  }
}