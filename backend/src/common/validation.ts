import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { ApiError } from './errors'

type Schema = z.ZodTypeAny

export const validate = (schema: { body?: Schema; query?: Schema; params?: Schema }) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body)
      }
      if (schema.query) {
        const parsedQuery = schema.query.parse(req.query) as Request['query']
        Object.assign(req.query, parsedQuery)
      }
      if (schema.params) {
        const parsedParams = schema.params.parse(req.params) as Request['params']
        Object.assign(req.params, parsedParams)
      }
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[validation] failed', {
          issues: error.issues,
          query: req.query,
          params: req.params,
          body: req.body,
        })
      } else {
        console.error('[validation] failed (non-zod)', error)
      }
      const message = error instanceof z.ZodError
        ? error.issues.map((err) => err.message).join(', ')
        : 'Invalid request'
      next(new ApiError(message, 400))
    }
  }

const normalizeQueryNumber = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === '' || raw == null) {
    return undefined
  }
  const num = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(num) ? num : undefined
}

export const paginationSchema = z.object({
  page: z.preprocess(normalizeQueryNumber, z.number().int().min(1)).optional(),
  limit: z.preprocess(normalizeQueryNumber, z.number().int().min(1).max(100)).optional(),
})