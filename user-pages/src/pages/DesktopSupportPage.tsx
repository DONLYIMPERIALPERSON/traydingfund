import React, { useState, useEffect } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import { supportService } from '../lib/support'
import type { SupportChat, SupportMessage } from '../lib/support'
import '../styles/DesktopSupportPage.css'

const DesktopSupportPage: React.FC = () => {
  const [chats, setChats] = useState<SupportChat[]>([])
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null)
  const [message, setMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [creatingChat, setCreatingChat] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if there are any open chats
  const hasOpenChats = chats.some(chat => chat.status === 'open')

  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = async () => {
    try {
      setLoading(true)
      setError(null)
      const userChats = await supportService.getChats()
      setChats(userChats)
    } catch (error) {
      console.error('Failed to load chats:', error)
      setError(error instanceof Error ? error.message : 'Failed to load support chats')
    } finally {
      setLoading(false)
    }
  }

  const selectChat = async (chat: SupportChat) => {
    try {
      // Get the full chat with messages
      const fullChat = await supportService.getChat(chat.id)
      console.log('Loaded full chat:', fullChat)
      console.log('Chat messages:', fullChat.messages)
      setSelectedChat(fullChat)

      // Mark as read if there are unread messages
      if (chat.unread_count > 0) {
        try {
          await supportService.markChatAsRead(chat.id)
          // Update the chat in the list to reflect read status
          setChats(prev => prev.map(c =>
            c.id === chat.id ? { ...c, unread_count: 0 } : c
          ))
        } catch (error) {
          console.error('Failed to mark chat as read:', error)
        }
      }
    } catch (error) {
      console.error('Failed to load chat:', error)
      alert(`Failed to load chat: ${error instanceof Error ? error.message : 'Please try again.'}`)
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

      // Reload the selected chat to show the new message
      const updatedChat = await supportService.getChat(selectedChat.id)
      setSelectedChat(updatedChat)
      // Update in the chat list
      setChats(prev => prev.map(c =>
        c.id === updatedChat.id ? updatedChat : c
      ))
    } catch (error) {
      console.error('Failed to send message:', error)
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setSending(false)
    }
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, or WebP).')
        return
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size must be less than 5MB.')
        return
      }

      setSelectedImage(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return 'Today'
    } else if (diffDays === 2) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const createNewChat = async (subject: string) => {
    if (creatingChat) return

    setCreatingChat(true)
    try {
      const newChat = await supportService.createChat(
        subject,
        `Hello! I need help with ${subject.toLowerCase()}.`
      )
      setChats(prev => [newChat, ...prev])
      setSelectedChat(newChat)
    } catch (error) {
      console.error('Failed to create chat:', error)
      alert(`Failed to create support chat: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setCreatingChat(false)
    }
  }

  const quickHelpItems = [
    {
      icon: 'fas fa-user-lock',
      title: 'Account Access',
      description: 'Help with login, password reset, and account security',
      onClick: () => createNewChat('Account Access')
    },
    {
      icon: 'fas fa-chart-line',
      title: 'Trading Issues',
      description: 'Problems with trades, orders, or platform functionality',
      onClick: () => createNewChat('Trading Issues')
    },
    {
      icon: 'fas fa-credit-card',
      title: 'Payout Problems',
      description: 'Issues with withdrawals, payments, or payout methods',
      onClick: () => createNewChat('Payout Problems')
    },
    {
      icon: 'fas fa-file-alt',
      title: 'Documentation',
      description: 'Help with challenges, rules, and trading guidelines',
      onClick: () => createNewChat('Documentation')
    },
    {
      icon: 'fas fa-cog',
      title: 'Technical Support',
      description: 'Platform bugs, errors, or technical difficulties',
      onClick: () => createNewChat('Technical Support')
    },
    {
      icon: 'fas fa-question-circle',
      title: 'General Questions',
      description: 'Any other questions or concerns you may have',
      onClick: () => createNewChat('General Questions')
    }
  ]

  if (loading) {
    return (
      <div className="support-page">
        <DesktopHeader />
        <DesktopSidebar />
        <div style={{
          marginLeft: '280px',
          padding: '24px',
          paddingTop: '80px',
          minHeight: '100vh',
          textAlign: 'center'
        }}>
          <div style={{ padding: '50px' }}>
            <div>Loading support chats...</div>
          </div>
        </div>
        <DesktopFooter />
      </div>
    )
  }

  if (error) {
    return (
      <div className="support-page">
        <DesktopHeader />
        <DesktopSidebar />
        <div style={{
          marginLeft: '280px',
          padding: '24px',
          paddingTop: '80px',
          minHeight: '100vh',
          textAlign: 'center',
          color: 'red'
        }}>
          <div style={{ padding: '50px' }}>
            <div>Error: {error}</div>
            <button onClick={loadChats} style={{ marginTop: '20px' }}>
              Try Again
            </button>
          </div>
        </div>
        <DesktopFooter />
      </div>
    )
  }

  return (
    <div className="support-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div style={{
        marginLeft: '280px', // Account for sidebar
        padding: '24px',
        paddingTop: '80px', // Add top padding to avoid header overlap
        minHeight: '100vh'
      }}>
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="back-button"
        >
          <i className="fas fa-arrow-left"></i>
          Back to Accounts Overview
        </button>

        {/* Page Header */}
        <div className="page-header">
          <h1>Support Center</h1>
          <p>Get help with your trading account and platform questions</p>
        </div>

        {/* Support Content */}
        <div className="support-content">
          {/* Chat Section */}
          <div className="chat-section" style={{width: '100%', maxWidth: 'none'}}>
            {!selectedChat ? (
              /* Chat List View */
              <>
                <div className="chat-header">
                  <div className="support-avatar">
                    <i className="fas fa-comments support-avatar-icon"></i>
                  </div>
                  <div className="support-info">
                    <h3>Your Support Chats</h3>
                    <p>Select a chat to view messages</p>
                  </div>
                </div>

                <div className="chat-list">
                  {/* Create New Chat Button - Always visible */}
                  <div style={{
                    padding: '16px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    marginBottom: '8px'
                  }}>
                    <button
                      className="start-new-chat-btn"
                      onClick={() => createNewChat('General Support')}
                      disabled={creatingChat}
                      style={{
                        width: '100%',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: creatingChat ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        opacity: creatingChat ? 0.6 : 1
                      }}
                    >
                      {creatingChat ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> Creating Chat...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-plus"></i> Start New Chat
                        </>
                      )}
                    </button>
                  </div>

                  {loading ? (
                    <div className="loading-chats">Loading chats...</div>
                  ) : chats.length === 0 ? (
                    <div className="no-chats">
                      <div className="no-chats-content">
                        <i className="fas fa-comments no-chats-icon"></i>
                        <h3>No support chats yet</h3>
                        <p>Get started by selecting a topic below or starting a new conversation.</p>
                      </div>
                    </div>
                  ) : (
                    chats.map((chat) => (
                      <div
                        key={chat.id}
                        className={`chat-list-item ${chat.unread_count > 0 ? 'unread' : ''}`}
                        onClick={() => selectChat(chat)}
                      >
                        <div className="chat-list-header">
                          <div className="chat-subject">{chat.subject}</div>
                          <div className="chat-meta">
                            <span className={`chat-status status-${chat.status}`}>
                              {chat.status}
                            </span>
                            {chat.unread_count > 0 && (
                              <span className="unread-badge">{chat.unread_count}</span>
                            )}
                          </div>
                        </div>
                        <div className="chat-preview">
                          <span className="last-message">{chat.last_message}</span>
                          <span className="chat-date">{formatDate(chat.updated_at)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Individual Chat View */
              <>
                <div className="chat-header">
                  <button
                    className="back-to-list"
                    onClick={() => setSelectedChat(null)}
                  >
                    <i className="fas fa-arrow-left"></i> Back to Chats
                  </button>
                  <div className="chat-title">
                    <h3>{selectedChat.subject}</h3>
                    <span className={`chat-status status-${selectedChat.status}`}>
                      {selectedChat.status}
                    </span>
                  </div>
                </div>

                <div className="chat-messages">
                  {selectedChat.messages && selectedChat.messages.length > 0 ? (
                    selectedChat.messages.map((msg) => (
                      <div key={msg.id} className={`message ${msg.sender}`}>
                        <div className="message-bubble">
                          {msg.image_url && (
                            <div className="message-image">
                              <img
                                src={msg.image_url}
                                alt="Shared image"
                                style={{
                                  maxWidth: '200px',
                                  maxHeight: '200px',
                                  borderRadius: '8px',
                                  marginBottom: '8px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => window.open(msg.image_url, '_blank')}
                              />
                            </div>
                          )}
                          <div className="message-text">{msg.message}</div>
                          <div className="message-time">{formatTime(msg.created_at)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '200px',
                      color: '#666',
                      fontSize: '16px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <i className="fas fa-comments" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                        <p>No messages in this chat yet.</p>
                        <p style={{ fontSize: '14px', marginTop: '8px' }}>Start the conversation below!</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input Area - Only show for open chats */}
                {selectedChat.status === 'open' && (
                  <div className="chat-input-area">
                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="image-preview-container">
                        <div className="image-preview">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            style={{
                              maxWidth: '100px',
                              maxHeight: '100px',
                              borderRadius: '8px',
                              objectFit: 'cover'
                            }}
                          />
                          <button
                            className="remove-image-btn"
                            onClick={removeImage}
                            type="button"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="chat-input-container">
                      <label className="attach-button" htmlFor="image-upload">
                        <i className="fas fa-image attach-icon"></i>
                      </label>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{ display: 'none' }}
                      />
                      <input
                        type="text"
                        className="chat-input"
                        placeholder={selectedImage ? "Add a message (optional)..." : "Enter your message..."}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={sending}
                      />
                      <button
                        className="send-button"
                        onClick={handleSendMessage}
                        disabled={(!message.trim() && !selectedImage) || sending}
                      >
                        {sending ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fas fa-paper-plane send-icon"></i>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Closed chat notice */}
                {selectedChat.status === 'closed' && (
                  <div className="closed-chat-notice">
                    <i className="fas fa-lock"></i>
                    This chat is closed. You cannot send new messages.
                  </div>
                )}
              </>
            )}
          </div>


        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopSupportPage
