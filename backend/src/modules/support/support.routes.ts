import { Router } from 'express'
import { authenticate, requireRole } from '../../common/auth'
import {
  listSupportTickets,
  getSupportTicket,
  createSupportTicketHandler,
  createSupportUploadHandler,
  sendSupportMessage,
  markSupportTicketRead,
  listAdminSupportTickets,
  getAdminSupportChat,
  assignAdminSupportChat,
  sendAdminSupportMessage,
  closeAdminSupportChat,
  markAdminSupportChatRead,
  uploadSupportImageHandler,
} from './support.controller'

export const supportRouter = Router()

supportRouter.get('/tickets', authenticate, requireRole('trader'), listSupportTickets)
supportRouter.get('/tickets/:ticketId', authenticate, requireRole('trader'), getSupportTicket)
supportRouter.post('/tickets', authenticate, requireRole('trader'), createSupportTicketHandler)
supportRouter.post('/tickets/:ticketId/messages', authenticate, requireRole('trader'), sendSupportMessage)
supportRouter.post('/tickets/:ticketId/read', authenticate, requireRole('trader'), markSupportTicketRead)
supportRouter.post('/uploads', authenticate, requireRole('trader'), createSupportUploadHandler)
supportRouter.post('/uploads/base64', authenticate, requireRole('trader'), uploadSupportImageHandler)

supportRouter.get('/admin/tickets', authenticate, requireRole(['admin', 'super_admin']), listAdminSupportTickets)
supportRouter.get('/admin/tickets/:ticketId', authenticate, requireRole(['admin', 'super_admin']), getAdminSupportChat)
supportRouter.post('/admin/tickets/:ticketId/assign', authenticate, requireRole(['admin', 'super_admin']), assignAdminSupportChat)
supportRouter.post('/admin/tickets/:ticketId/messages', authenticate, requireRole(['admin', 'super_admin']), sendAdminSupportMessage)
supportRouter.post('/admin/tickets/:ticketId/close', authenticate, requireRole(['admin', 'super_admin']), closeAdminSupportChat)
supportRouter.post('/admin/tickets/:ticketId/read', authenticate, requireRole(['admin', 'super_admin']), markAdminSupportChatRead)