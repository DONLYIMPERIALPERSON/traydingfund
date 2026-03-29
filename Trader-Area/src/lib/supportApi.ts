import { apiFetch } from '../lib/api'

export interface SupportChat {
  id: string;
  subject: string;
  status: 'open' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  last_message: string;
  unread_count: number;
  user_unread_count?: number;
  assigned_to?: string | null;
  user_id?: number;
  messages: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  chat_id: string;
  sender: 'user' | 'support';
  message: string;
  image_url?: string | undefined;
  created_at: string;
  is_read: boolean;
}

class SupportService {
  async getChats(): Promise<SupportChat[]> {
    return apiFetch<SupportChat[]>('/support/tickets')
  }

  async getChat(chatId: string): Promise<SupportChat> {
    return apiFetch<SupportChat>(`/support/tickets/${encodeURIComponent(chatId)}`)
  }

  async createChat(subject: string, message: string): Promise<SupportChat> {
    return apiFetch<SupportChat>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify({ subject, message }),
    })
  }

  async sendMessage(chatId: string, message: string): Promise<SupportMessage> {
    const response = await apiFetch<SupportChat>(`/support/tickets/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
    const last = response.messages[response.messages.length - 1]
    return {
      id: last?.id ?? `${Date.now()}`,
      chat_id: chatId,
      sender: last?.sender ?? 'user',
      message: last?.message ?? message,
      image_url: last?.image_url,
      created_at: last?.created_at ?? new Date().toISOString(),
      is_read: last?.is_read ?? true,
    }
  }

  async sendMessageWithImage(chatId: string, message: string, imageFile?: File): Promise<SupportMessage> {
    if (!imageFile) {
      return this.sendMessage(chatId, message || 'Image uploaded')
    }

    const uploadResponse = await apiFetch<{ upload_url: string; public_url: string | null; key: string }>(
      '/support/uploads',
      {
        method: 'POST',
        body: JSON.stringify({
          filename: imageFile.name,
          content_type: imageFile.type || 'application/octet-stream',
        }),
      }
    )

    await fetch(uploadResponse.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': imageFile.type || 'application/octet-stream' },
      body: imageFile,
    })

    const response = await apiFetch<SupportChat>(`/support/tickets/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message: message || 'Image uploaded', image_url: uploadResponse.public_url }),
    })

    const last = response.messages[response.messages.length - 1]
    return {
      id: last?.id ?? `${Date.now()}`,
      chat_id: chatId,
      sender: last?.sender ?? 'user',
      message: last?.message ?? message,
      image_url: last?.image_url ?? uploadResponse.public_url ?? undefined,
      created_at: last?.created_at ?? new Date().toISOString(),
      is_read: last?.is_read ?? true,
    }
  }

  async markChatAsRead(chatId: string): Promise<void> {
    await apiFetch<{ message: string }>(`/support/tickets/${encodeURIComponent(chatId)}/read`, {
      method: 'POST',
    })
  }
}

export const supportService = new SupportService();