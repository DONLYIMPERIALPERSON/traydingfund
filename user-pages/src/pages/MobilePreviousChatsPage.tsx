import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supportService } from '../lib/support'
import '../styles/MobilePreviousChatsPage.css'

interface Chat {
  id: string
  subject: string
  status: 'open' | 'closed'
  priority: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
  last_message: string
  unread_count: number
}

const MobilePreviousChatsPage: React.FC = () => {
  const navigate = useNavigate()
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [newChatSubject, setNewChatSubject] = useState('')
  const [newChatMessage, setNewChatMessage] = useState('')
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  // Check if there are any open chats
  const hasOpenChats = chats.some(chat => chat.status === 'open')

  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = async () => {
    try {
      const chatData = await supportService.getChats()
      setChats(chatData)
    } catch (error) {
      console.error('Failed to load chats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/') // Go back to dashboard/home page
  }

  const handleChatClick = (chatId: string) => {
    navigate(`/support/chat/${chatId}`)
  }

  const handleCreateNewChat = async () => {
    if (!newChatSubject.trim() || !newChatMessage.trim()) {
      alert('Please enter both subject and message.')
      return
    }

    setIsCreatingChat(true)
    try {
      const newChat = await supportService.createChat(newChatSubject.trim(), newChatMessage.trim())
      // Navigate to the newly created chat
      navigate(`/support/chat/${newChat.id}`)
    } catch (error) {
      console.error('Failed to create chat:', error)
      alert('Failed to create new chat. Please try again.')
    } finally {
      setIsCreatingChat(false)
      setShowNewChatModal(false)
      setNewChatSubject('')
      setNewChatMessage('')
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return { bg: 'rgba(40, 167, 69, 0.15)', color: '#28a745' }
      case 'closed':
        return { bg: 'rgba(220, 53, 69, 0.15)', color: '#dc3545' }
      default:
        return { bg: 'rgba(149, 165, 166, 0.15)', color: '#95a5a6' }
    }
  }

  if (isLoading) {
    return (
      <div className="mobile-previous-chats-page">
        <div className="mobile-previous-chats-fixed-header">
          <div className="mobile-previous-chats-header-shell">
            <div className="mobile-previous-chats-header-row">
              <div className="mobile-previous-chats-header-left">
                <div className="mobile-previous-chats-back-button" onClick={handleBack}>
                  <i className="fas fa-chevron-left"></i>
                </div>
              </div>
              <div className="mobile-previous-chats-header-center">
                <span className="mobile-previous-chats-header-title">Support</span>
              </div>
              <div className="mobile-previous-chats-header-right" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="mobile-previous-chats-content-container">
          <div style={{padding: '24px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.6)'}}>
            Loading chats...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-previous-chats-page">
      <div className="mobile-previous-chats-fixed-header">
        <div className="mobile-previous-chats-header-shell">
          <div className="mobile-previous-chats-header-row">
            <div className="mobile-previous-chats-header-left">
              <div className="mobile-previous-chats-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-previous-chats-header-center">
              <span className="mobile-previous-chats-header-title">Support</span>
            </div>
            <div className="mobile-previous-chats-header-right">
              {!hasOpenChats && (
                <button
                  onClick={() => setShowNewChatModal(true)}
                  style={{
                    background: 'rgba(255,215,0,0.8)',
                    color: 'black',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  New Chat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mobile-previous-chats-content-container">
        <div style={{padding: '24px 20px'}}>
          {chats.length === 0 ? (
            <div style={{textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: '40px 20px'}}>
              <div style={{fontSize: '16px', marginBottom: '8px'}}>No previous chats</div>
              <div style={{fontSize: '14px'}}>Start a new conversation with our support team.</div>
              <button
                onClick={() => setShowNewChatModal(true)}
                style={{
                  background: 'rgba(255,215,0,0.8)',
                  color: 'black',
                  border: 'none',
                  borderRadius: '24px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                Start New Chat
              </button>
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              {chats.map((chat) => {
                const statusStyle = getStatusColor(chat.status)
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleChatClick(chat.id)}
                    style={{
                      background: 'rgba(255,215,0,0.05)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '0.5px solid rgba(255,215,0,0.1)',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    {chat.unread_count > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: '#ff4757',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {chat.unread_count}
                      </div>
                    )}
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
                      <div>
                        <div style={{fontSize: '16px', fontWeight: '600', color: 'white'}}>
                          {formatDate(chat.updated_at)}
                        </div>
                        <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.6)'}}>
                          {formatTime(chat.updated_at)}
                        </div>
                      </div>
                      <div style={{
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {chat.status}
                      </div>
                    </div>
                    <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px'}}>
                      <strong>{chat.subject}</strong>
                    </div>
                    <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.6)'}}>
                      {chat.last_message || 'No messages yet'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px'
          }}>
            <div style={{marginBottom: '20px'}}>
              <h3 style={{color: 'white', margin: '0 0 16px 0', fontSize: '18px'}}>Start New Chat</h3>

              <div style={{marginBottom: '16px'}}>
                <label style={{display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginBottom: '8px'}}>
                  Subject
                </label>
                <input
                  type="text"
                  value={newChatSubject}
                  onChange={(e) => setNewChatSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{marginBottom: '24px'}}>
                <label style={{display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginBottom: '8px'}}>
                  Message
                </label>
                <textarea
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    fontSize: '16px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            <div style={{display: 'flex', gap: '12px'}}>
              <button
                onClick={() => {
                  setShowNewChatModal(false)
                  setNewChatSubject('')
                  setNewChatMessage('')
                }}
                style={{
                  flex: 1,
                  background: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewChat}
                disabled={isCreatingChat || !newChatSubject.trim() || !newChatMessage.trim()}
                style={{
                  flex: 1,
                  background: isCreatingChat ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.8)',
                  color: 'black',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isCreatingChat ? 'not-allowed' : 'pointer'
                }}
              >
                {isCreatingChat ? 'Creating...' : 'Start Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobilePreviousChatsPage
