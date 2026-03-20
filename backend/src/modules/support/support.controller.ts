import type { Request, Response, NextFunction } from 'express'
import { ApiError } from '../../common/errors'
import { AuthenticatedRequest } from '../../common/auth'
import {
  addSupportMessage,
  assignTicket,
  closeTicket,
  createSupportTicket,
  createSupportUpload,
  getTicketWithMessages,
  listAdminTickets,
  listUserTickets,
  markTicketRead,
  uploadSupportImage,
} from '../../services/support.service'

const ensureAuthUser = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401)
  }
  return req.user
}

export const listSupportTickets = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureAuthUser(req)
    const tickets = await listUserTickets(user.id)
    res.json(tickets)
  } catch (err) {
    next(err as Error)
  }
}

export const getSupportTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureAuthUser(req)
    const id = Number(req.params.ticketId)
    if (!id) {
      throw new ApiError('Ticket ID is required', 400)
    }

    const ticket = await getTicketWithMessages(id)
    if (!ticket) {
      throw new ApiError('Support ticket not found', 404)
    }
    if (ticket.user_id !== user.id) {
      throw new ApiError('Forbidden', 403)
    }

    res.json(ticket)
  } catch (err) {
    next(err as Error)
  }
}

export const createSupportTicketHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureAuthUser(req)
    const { subject, message } = req.body as { subject?: string; message?: string }
    if (!subject?.trim()) {
      throw new ApiError('Subject is required', 400)
    }
    if (!message?.trim()) {
      throw new ApiError('Message is required', 400)
    }

    const ticket = await createSupportTicket(user.id, subject.trim(), message.trim())
    const response = await getTicketWithMessages(ticket.id)
    res.status(201).json(response)
  } catch (err) {
    next(err as Error)
  }
}

export const createSupportUploadHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureAuthUser(req)
    const { filename, content_type } = req.body as { filename?: string; content_type?: string }
    if (!filename || !content_type) {
      throw new ApiError('filename and content_type are required', 400)
    }
    const payload = await createSupportUpload({
      userId: user.id,
      fileName: filename,
      contentType: content_type,
    })
    res.json({
      upload_url: payload.uploadUrl,
      public_url: payload.publicUrl,
      key: payload.key,
    })
  } catch (err) {
    next(err as Error)
  }
}

export const sendSupportMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureAuthUser(req)
    const ticketId = Number(req.params.ticketId)
    const { message, image_url } = req.body as { message?: string | null; image_url?: string | null }
    if (!ticketId) {
      throw new ApiError('Ticket ID is required', 400)
    }
    if (!message?.trim() && !image_url) {
      throw new ApiError('Message or image_url is required', 400)
    }

    const ticket = await getTicketWithMessages(ticketId)
    if (!ticket) {
      throw new ApiError('Support ticket not found', 404)
    }
    if (ticket.user_id !== user.id) {
      throw new ApiError('Forbidden', 403)
    }

    await addSupportMessage(ticketId, 'user', message?.trim() ?? null, image_url ?? null)
    const updated = await getTicketWithMessages(ticketId)
    res.json(updated)
  } catch (err) {
    next(err as Error)
  }
}

export const markSupportTicketRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureAuthUser(req)
    const ticketId = Number(req.params.ticketId)
    if (!ticketId) {
      throw new ApiError('Ticket ID is required', 400)
    }
    const ticket = await getTicketWithMessages(ticketId)
    if (!ticket) {
      throw new ApiError('Support ticket not found', 404)
    }
    if (ticket.user_id !== user.id) {
      throw new ApiError('Forbidden', 403)
    }
    await markTicketRead(ticketId, 'user')
    res.json({ message: 'Chat marked read' })
  } catch (err) {
    next(err as Error)
  }
}

export const listAdminSupportTickets = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    ensureAuthUser(req)
    const status = (req.query.status as string | undefined)?.toLowerCase()
    const normalized = status === 'open' || status === 'closed' ? status : undefined
    const tickets = await listAdminTickets(normalized)
    res.json(tickets)
  } catch (err) {
    next(err as Error)
  }
}

export const getAdminSupportChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    ensureAuthUser(req)
    const ticketId = Number(req.params.ticketId)
    if (!ticketId) {
      throw new ApiError('Ticket ID is required', 400)
    }
    const ticket = await getTicketWithMessages(ticketId)
    if (!ticket) {
      throw new ApiError('Support ticket not found', 404)
    }
    res.json(ticket)
  } catch (err) {
    next(err as Error)
  }
}

export const assignAdminSupportChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    ensureAuthUser(req)
    const ticketId = Number(req.params.ticketId)
    const { assigned_to } = req.body as { assigned_to?: string }
    if (!ticketId) {
      throw new ApiError('Ticket ID is required', 400)
    }
    if (!assigned_to?.trim()) {
      throw new ApiError('assigned_to is required', 400)
    }
    await assignTicket(ticketId, assigned_to.trim())
    res.json({ message: 'Chat assigned' })
  } catch (err) {
    next(err as Error)
  }
}

export const sendAdminSupportMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    ensureAuthUser(req)
    const ticketId = Number(req.params.ticketId)
    const { message, image_url, admin_name } = req.body as { message?: string; image_url?: string | null; admin_name?: string }
    if (!ticketId) {
      throw new ApiError('Ticket ID is required', 400)
    }
    if (!message?.trim() && !image_url) {
      throw new ApiError('Message or image_url is required', 400)
    }

    await addSupportMessage(ticketId, 'support', message?.trim() ?? null, image_url ?? null)
    if (admin_name?.trim()) {
      await assignTicket(ticketId, admin_name.trim())
    }
    const updated = await getTicketWithMessages(ticketId)
    res.json(updated)
  } catch (err) {
    next(err as Error)
  }
}

export const closeAdminSupportChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    ensureAuthUser(req)
    const ticketId = Number(req.params.ticketId)
    if (!ticketId) {
      throw new ApiError('Ticket ID is required', 400)
    }
    await closeTicket(ticketId)
    res.json({ message: 'Chat closed' })
  } catch (err) {
    next(err as Error)
  }
}

export const markAdminSupportChatRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    ensureAuthUser(req)
    const ticketId = Number(req.params.ticketId)
    if (!ticketId) {
      throw new ApiError('Ticket ID is required', 400)
    }
    await markTicketRead(ticketId, 'admin')
    res.json({ message: 'Chat marked read' })
  } catch (err) {
    next(err as Error)
  }
}

export const uploadSupportImageHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = ensureAuthUser(req)
    const { filename, content_type, file_base64 } = req.body as { filename?: string; content_type?: string; file_base64?: string }
    if (!filename || !content_type || !file_base64) {
      throw new ApiError('filename, content_type, and file_base64 are required', 400)
    }

    const buffer = Buffer.from(file_base64, 'base64')
    const payload = await uploadSupportImage({
      userId: user.id,
      fileName: filename,
      contentType: content_type,
      buffer,
    })

    res.json({
      public_url: payload.publicUrl,
      key: payload.key,
    })
  } catch (err) {
    next(err as Error)
  }
}