import { prisma } from '../config/prisma'
import { Prisma } from '@prisma/client'
import { createSignedUploadUrl, uploadBufferToR2 } from './r2.service'

const SUPPORT_UPLOAD_PREFIX = 'support/uploads'

export type SupportTicketStatus = 'open' | 'closed'
export type SupportTicketPriority = 'low' | 'medium' | 'high'
export type SupportMessageSender = 'user' | 'support'

export type SupportTicketSummary = {
  id: string
  subject: string
  status: SupportTicketStatus
  priority: SupportTicketPriority
  assigned_to: string | null
  user_name: string
  user_email: string
  created_at: string
  updated_at: string
  last_message: string | null
  unread_count: number
  user_unread_count: number
}

export type SupportMessagePayload = {
  id: string
  chat_id: string
  sender: SupportMessageSender
  message: string | null
  image_url: string | null
  created_at: string
  is_read: boolean
}

export type SupportChatPayload = {
  id: string
  user_id: number
  subject: string
  status: SupportTicketStatus
  priority: SupportTicketPriority
  assigned_to: string | null
  created_at: string
  updated_at: string
  last_message: string | null
  unread_count: number
  user_unread_count: number
  messages: SupportMessagePayload[]
}

const mapTicketSummary = (ticket: {
  id: number
  subject: string
  status: string
  priority: string
  assignedTo: string | null
  lastMessage: string | null
  adminUnreadCount: number
  userUnreadCount: number
  createdAt: Date
  updatedAt: Date
  user: { fullName: string | null; email: string }
}): SupportTicketSummary => ({
  id: String(ticket.id),
  subject: ticket.subject,
  status: ticket.status as SupportTicketStatus,
  priority: ticket.priority as SupportTicketPriority,
  assigned_to: ticket.assignedTo,
  user_name: ticket.user.fullName ?? ticket.user.email,
  user_email: ticket.user.email,
  created_at: ticket.createdAt.toISOString(),
  updated_at: ticket.updatedAt.toISOString(),
  last_message: ticket.lastMessage,
  unread_count: ticket.adminUnreadCount,
  user_unread_count: ticket.userUnreadCount,
})

const mapMessagePayload = (message: {
  id: number
  sender: string
  message: string | null
  imageUrl: string | null
  isRead: boolean
  createdAt: Date
}): SupportMessagePayload => ({
  id: String(message.id),
  chat_id: '',
  sender: message.sender as SupportMessageSender,
  message: message.message,
  image_url: message.imageUrl ?? null,
  created_at: message.createdAt.toISOString(),
  is_read: message.isRead,
})

type SupportTicketWithUser = Prisma.SupportTicketGetPayload<{
  include: { user: { select: { fullName: true; email: true } } }
}>

export const listUserTickets = async (userId: number) => {
  const tickets: SupportTicketWithUser[] = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { fullName: true, email: true } },
    },
  })

  return tickets.map(mapTicketSummary)
}

export const listAdminTickets = async (status?: SupportTicketStatus) => {
  const tickets: SupportTicketWithUser[] = await prisma.supportTicket.findMany({
    where: status ? { status } : {},
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { fullName: true, email: true } },
    },
  })

  return tickets.map(mapTicketSummary)
}

export const getTicketWithMessages = async (ticketId: number) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!ticket) return null

  return {
    id: String(ticket.id),
    user_id: ticket.userId,
    subject: ticket.subject,
    status: ticket.status as SupportTicketStatus,
    priority: ticket.priority as SupportTicketPriority,
    assigned_to: ticket.assignedTo,
    created_at: ticket.createdAt.toISOString(),
    updated_at: ticket.updatedAt.toISOString(),
    last_message: ticket.lastMessage,
    unread_count: ticket.adminUnreadCount,
    user_unread_count: ticket.userUnreadCount,
    messages: ticket.messages.map((message: {
      id: number
      sender: string
      message: string | null
      imageUrl: string | null
      isRead: boolean
      createdAt: Date
    }) => ({
      ...mapMessagePayload(message),
      chat_id: String(ticket.id),
    })),
  } satisfies SupportChatPayload
}

export const createSupportTicket = async (userId: number, subject: string, initialMessage: string) => {
  return prisma.supportTicket.create({
    data: {
      userId,
      subject,
      status: 'open',
      priority: 'low',
      lastMessage: initialMessage,
      userUnreadCount: 0,
      adminUnreadCount: 1,
      messages: {
        create: {
          sender: 'user',
          message: initialMessage,
          isRead: true,
        },
      },
    },
  })
}

export const addSupportMessage = async (ticketId: number, sender: SupportMessageSender, message: string | null, imageUrl?: string | null) => {
  const isUser = sender === 'user'
  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      lastMessage: message ?? 'Image uploaded',
      ...(isUser
        ? { adminUnreadCount: { increment: 1 } }
        : { userUnreadCount: { increment: 1 } }),
      messages: {
        create: {
          sender,
          message,
          imageUrl: imageUrl ?? null,
          isRead: sender === 'user',
        },
      },
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  return ticket
}

export const markTicketRead = async (ticketId: number, target: 'user' | 'admin') => {
  const data = target === 'user'
    ? { userUnreadCount: 0 }
    : { adminUnreadCount: 0 }

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data,
  })

  await prisma.supportMessage.updateMany({
    where: {
      ticketId,
      sender: target === 'user' ? 'support' : 'user',
      isRead: false,
    },
    data: { isRead: true },
  })
}

export const assignTicket = async (ticketId: number, assignedTo: string) => {
  return prisma.supportTicket.update({
    where: { id: ticketId },
    data: { assignedTo },
  })
}

export const closeTicket = async (ticketId: number) => {
  return prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: 'closed' },
  })
}

export const createSupportUpload = async ({ userId, fileName, contentType }: { userId: number; fileName: string; contentType: string }) => {
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const key = `${SUPPORT_UPLOAD_PREFIX}/${userId}/${Date.now()}-${safeName}`
  return createSignedUploadUrl({ key, contentType })
}

export const uploadSupportImage = async ({
  userId,
  fileName,
  contentType,
  buffer,
}: {
  userId: number
  fileName: string
  contentType: string
  buffer: Buffer | Uint8Array
}) => {
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const key = `${SUPPORT_UPLOAD_PREFIX}/${userId}/${Date.now()}-${safeName}`
  return uploadBufferToR2({ key, contentType, body: buffer })
}