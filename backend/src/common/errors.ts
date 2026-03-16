import { Request, Response, NextFunction } from 'express'

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: 'Not Found' })
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof ApiError ? err.status : 500
  res.status(status).json({ message: err.message || 'Internal Server Error' })
}