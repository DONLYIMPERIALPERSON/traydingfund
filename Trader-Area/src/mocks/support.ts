const mockDelay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms))
const mockChats: SupportChat[] = [
  {
    id: 'chat-001',
    subject: 'Account Access',
    status: 'open',
    priority: 'high',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    last_message: 'We are reviewing your login issue now.',
    unread_count: 1,
    messages: [
      {
        id: 'msg-001',
        chat_id: 'chat-001',
        sender: 'user',
        message: 'I cannot access my account.',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        is_read: true,
      },
      {
        id: 'msg-002',
        chat_id: 'chat-001',
        sender: 'support',
        message: 'We are reviewing your login issue now.',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        is_read: false,
      },
    ],
  },
  {
    id: 'chat-002',
    subject: 'Payout Status',
    status: 'closed',
    priority: 'medium',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    last_message: 'Your payout was completed successfully.',
    unread_count: 0,
    messages: [
      {
        id: 'msg-003',
        chat_id: 'chat-002',
        sender: 'support',
        message: 'Your payout was completed successfully.',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        is_read: true,
      },
    ],
  },
]

export interface SupportChat {
  id: string;
  subject: string;
  status: 'open' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  last_message: string;
  unread_count: number;
  messages: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  chat_id: string;
  sender: 'user' | 'support';
  message: string;
  image_url?: string;
  created_at: string;
  is_read: boolean;
}

class SupportService {
  async getChats(): Promise<SupportChat[]> {
    await mockDelay()
    return mockChats
  }

  async getChat(chatId: string): Promise<SupportChat> {
    await mockDelay()
    const chat = mockChats.find((item) => item.id === chatId)
    if (!chat) throw new Error('Chat not found')
    return chat
  }

  async createChat(subject: string, message: string): Promise<SupportChat> {
    await mockDelay()
    const newChat: SupportChat = {
      id: `chat-${Date.now()}`,
      subject,
      status: 'open',
      priority: 'low',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message: message,
      unread_count: 0,
      messages: [
        {
          id: `msg-${Date.now()}`,
          chat_id: `chat-${Date.now()}`,
          sender: 'user',
          message,
          created_at: new Date().toISOString(),
          is_read: true,
        },
      ],
    }
    mockChats.unshift(newChat)
    return newChat
  }

  async sendMessage(chatId: string, message: string): Promise<SupportMessage> {
    await mockDelay()
    const chat = mockChats.find((item) => item.id === chatId)
    if (!chat) throw new Error('Chat not found')
    const newMessage: SupportMessage = {
      id: `msg-${Date.now()}`,
      chat_id: chatId,
      sender: 'user',
      message,
      created_at: new Date().toISOString(),
      is_read: true,
    }
    chat.messages.push(newMessage)
    chat.last_message = message
    chat.updated_at = new Date().toISOString()
    return newMessage
  }

  async sendMessageWithImage(chatId: string, message: string, imageFile?: File): Promise<SupportMessage> {
    await mockDelay()
    const image_url = imageFile ? URL.createObjectURL(imageFile) : undefined
    const baseMessage = await this.sendMessage(chatId, message || 'Image uploaded')
    if (!image_url) {
      return baseMessage
    }
    return { ...baseMessage, image_url }
  }

  async markChatAsRead(chatId: string): Promise<void> {
    await mockDelay()
    const chat = mockChats.find((item) => item.id === chatId)
    if (chat) {
      chat.unread_count = 0
      chat.messages = chat.messages.map((msg) => ({ ...msg, is_read: true }))
    }
  }
}

export const supportService = new SupportService();