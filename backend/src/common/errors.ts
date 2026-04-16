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
  const responseMessage = status >= 500 ? 'Internal Server Error' : (err.message || 'Request failed')

  console.error('[ERROR HANDLER]', {
    name: err.name,
    message: err.message,
    status,
    stack: err.stack,
    rawResponse: (err as Error & { rawResponse?: string }).rawResponse,
    headers: (err as Error & { headers?: Record<string, string> }).headers,
  })

  res.status(status).json({ message: responseMessage })
}