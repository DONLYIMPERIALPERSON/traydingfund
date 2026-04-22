import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supportService } from '../lib/supportApi'
import type { SupportChat } from '../lib/supportApi'
import '../styles/MobileSupportPage.css'

const MobileSupportPage: React.FC = () => {
  const navigate = useNavigate()
  const { chatId } = useParams()
  const [chats, setChats] = useState<SupportChat[]>([])
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null)
  const [message, setMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [creatingChat, setCreatingChat] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadChats()
  }, [])

  useEffect(() => {
    if (!chatId || chats.length === 0) return
    const existing = chats.find((chat) => chat.id === chatId)
    if (existing) {
      void selectChat(existing)
    }
  }, [chatId, chats])

  const loadChats = async () => {
    try {
      setLoading(true)
      setError(null)
      const userChats = await supportService.getChats()
      setChats(userChats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support chats')
    } finally {
      setLoading(false)
    }
  }

  const selectChat = async (chat: SupportChat) => {
    try {
      const fullChat = await supportService.getChat(chat.id)
      setSelectedChat(fullChat)

      if (chat.unread_count > 0) {
        try {
          await supportService.markChatAsRead(chat.id)
          setChats((prev) => prev.map((c) => c.id === chat.id ? { ...c, unread_count: 0 } : c))
        } catch {
          // ignore read failure silently
        }
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to load chat')
    }
  }

  const handleSendMessage = async () => {
    if ((!message.trim() && !selectedImage) || !selectedChat || sending) return

    setSending(true)
    try {
      if (selectedImage) {
        await supportService.sendMessageWithImage(selectedChat.id, message.trim() || ' ', selectedImage)
      } else {
        await supportService.sendMessage(selectedChat.id, message.trim())
      }

      setMessage('')
      setSelectedImage(null)
      setImagePreview(null)

      const updatedChat = await supportService.getChat(selectedChat.id)
      setSelectedChat(updatedChat)
      setChats((prev) => prev.map((c) => c.id === updatedChat.id ? updatedChat : c))
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      window.alert('Please select a valid image file (JPEG, PNG, GIF, or WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      window.alert('Image file size must be less than 5MB.')
      return
    }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const createNewChat = async (subject: string) => {
    if (creatingChat) return

    setCreatingChat(true)
    try {
      const newChat = await supportService.createChat(subject, `Hello! I need help with ${subject.toLowerCase()}.`)
      setChats((prev) => [newChat, ...prev])
      setSelectedChat(newChat)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to create support chat')
    } finally {
      setCreatingChat(false)
    }
  }

  const quickHelpItems = [
    { icon: 'fas fa-user-lock', title: 'Account Access', onClick: () => createNewChat('Account Access') },
    { icon: 'fas fa-chart-line', title: 'Trading Issues', onClick: () => createNewChat('Trading Issues') },
    { icon: 'fas fa-credit-card', title: 'Payout Problems', onClick: () => createNewChat('Payout Problems') },
    { icon: 'fas fa-file-alt', title: 'Documentation', onClick: () => createNewChat('Documentation') },
    { icon: 'fas fa-cog', title: 'Technical Support', onClick: () => createNewChat('Technical Support') },
    { icon: 'fas fa-question-circle', title: 'General Questions', onClick: () => createNewChat('General Questions') },
  ]

  return (
    <div className="mobile-support-page">
      <div className="mobile-support-shell">
        <header className="mobile-support-header">
          <button type="button" className="mobile-support-header__icon" onClick={() => selectedChat ? setSelectedChat(null) : window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-support-header__text">
            <h1>{selectedChat ? selectedChat.subject : 'Support'}</h1>
            <p>{selectedChat ? 'Chat with support' : 'Get help with your account and platform'}</p>
          </div>
          <button type="button" className="mobile-support-header__icon" onClick={() => navigate('/')}>
            <i className="fas fa-home" />
          </button>
        </header>

        {loading ? (
          <div className="mobile-support-empty">Loading support chats...</div>
        ) : error ? (
          <div className="mobile-support-empty">
            <p>{error}</p>
            <button type="button" onClick={() => void loadChats()}>Try Again</button>
          </div>
        ) : !selectedChat ? (
          <>
            <button className="mobile-support-new-chat" onClick={() => void createNewChat('General Support')} disabled={creatingChat}>
              <i className={`fas ${creatingChat ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
              {creatingChat ? 'Creating Chat...' : 'Start New Chat'}
            </button>

            <section className="mobile-support-quick-help">
              {quickHelpItems.map((item) => (
                <button key={item.title} type="button" className="mobile-support-help-item" onClick={() => void item.onClick()}>
                  <i className={item.icon} />
                  <span>{item.title}</span>
                </button>
              ))}
            </section>

            <section className="mobile-support-chat-list">
              {chats.length === 0 ? (
                <div className="mobile-support-empty">No support chats yet.</div>
              ) : (
                chats.map((chat) => (
                  <button key={chat.id} type="button" className={`mobile-support-chat-item ${chat.unread_count > 0 ? 'is-unread' : ''}`} onClick={() => void selectChat(chat)}>
                    <div className="mobile-support-chat-item__top">
                      <strong>{chat.subject}</strong>
                      <span>{formatDate(chat.updated_at)}</span>
                    </div>
                    <div className="mobile-support-chat-item__bottom">
                      <p>{chat.last_message}</p>
                      {chat.unread_count > 0 ? <span className="mobile-support-unread-badge">{chat.unread_count}</span> : null}
                    </div>
                  </button>
                ))
              )}
            </section>
          </>
        ) : (
          <section className="mobile-support-chat-view">
            <div className="mobile-support-messages">
              {selectedChat.messages && selectedChat.messages.length > 0 ? (
                selectedChat.messages.map((msg) => (
                  <div key={msg.id} className={`mobile-support-message ${msg.sender}`}>
                    <div className="mobile-support-message__bubble">
                      {msg.image_url ? <img src={msg.image_url} alt="Shared" onClick={() => window.open(msg.image_url, '_blank')} /> : null}
                      <div>{msg.message}</div>
                      <span>{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="mobile-support-empty">No messages in this chat yet.</div>
              )}
            </div>

            {selectedChat.status === 'open' ? (
              <div className="mobile-support-input-area">
                {imagePreview ? (
                  <div className="mobile-support-image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button type="button" onClick={removeImage}><i className="fas fa-times" /></button>
                  </div>
                ) : null}

                <div className="mobile-support-input-row">
                  <label className="mobile-support-attach" htmlFor="mobile-support-image-upload">
                    <i className="fas fa-image" />
                  </label>
                  <input id="mobile-support-image-upload" type="file" accept="image/*" onChange={handleImageSelect} hidden />
                  <input
                    type="text"
                    className="mobile-support-input"
                    placeholder={selectedImage ? 'Add a message (optional)...' : 'Enter your message...'}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                  />
                  <button className="mobile-support-send" onClick={() => void handleSendMessage()} disabled={(!message.trim() && !selectedImage) || sending}>
                    <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mobile-support-closed">This chat is closed. You cannot send new messages.</div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default MobileSupportPage