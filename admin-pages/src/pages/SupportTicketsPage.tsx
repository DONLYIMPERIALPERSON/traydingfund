import { useEffect, useMemo, useState } from 'react'
import type { AdminUser } from './UsersPage'
import {
  fetchSupportTickets,
  fetchSupportChat,
  assignSupportChat,
  sendSupportMessage,
  closeSupportChat,
  markSupportChatAsRead,
  type SupportTicket,
  type SupportChat,
  type SupportMessage,
  getPersistedAdminUser
} from '../lib/adminMock'

interface SupportTicketsPageProps {
  onOpenProfile: (user: AdminUser) => void
  initialChatId?: string | null
  onChatOpened?: () => void
}

const SupportTicketsPage = ({ onOpenProfile, initialChatId, onChatOpened }: SupportTicketsPageProps) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')

  const adminUser = getPersistedAdminUser()
  const adminName = adminUser?.full_name || 'Admin'

  useEffect(() => {
    loadTickets()
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [activeTab])

  useEffect(() => {
    if (!initialChatId || tickets.length === 0) return
    const ticket = tickets.find((item) => item.id === initialChatId)
    if (ticket) {
      void handleTicketClick(ticket)
      onChatOpened?.()
    }
  }, [initialChatId, tickets])

  const loadTickets = async () => {
    try {
      setLoading(true)
      setError(null)
      const status = activeTab === 'history' ? 'closed' : 'open'
      const tickets = await fetchSupportTickets(status)
      console.log('Loaded tickets:', tickets)
      setTickets(tickets)
    } catch (err) {
      console.error('Error loading tickets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  const unassignedTickets = useMemo(() => tickets.filter((ticket) => !ticket.assigned_to), [tickets])
  const assignedTickets = useMemo(() => tickets.filter((ticket) => Boolean(ticket.assigned_to)), [tickets])
  const unansweredTickets = useMemo(() => tickets.filter((ticket) => ticket.user_unread_count > 0 && !ticket.assigned_to), [tickets])

  const formatCountdown = (createdAt: string) => {
    const expiresAt = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000
    const remaining = expiresAt - now

    if (remaining <= 0) return 'Overdue'

    const totalSeconds = Math.floor(remaining / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`
  }

  const handleTicketClick = async (ticket: SupportTicket) => {
    try {
      const chat = await fetchSupportChat(ticket.id)
      setSelectedChat(chat)

      // Mark user messages as read
      if (ticket.user_unread_count > 0) {
        await markSupportChatAsRead(ticket.id)
        // Refresh tickets to update counts
        loadTickets()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat')
    }
  }

  const handleSendMessage = async () => {
    if (!selectedChat || !newMessage.trim() || sending) return

    try {
      setSending(true)

      // Assign chat to admin if not already assigned
      if (!selectedChat.assigned_to) {
        await assignSupportChat(selectedChat.id, adminName)
      }

      // Send message
      const updatedChat = await sendSupportMessage(selectedChat.id, newMessage.trim(), adminName)
      setSelectedChat(updatedChat)
      loadTickets()
      setNewMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleCloseTicket = async () => {
    if (!selectedChat) return

    try {
      await closeSupportChat(selectedChat.id)
      setSelectedChat(null)
      loadTickets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close ticket')
    }
  }

  const openProfile = (ticket: SupportTicket) => {
    onOpenProfile({
      name: ticket.user_name,
      email: ticket.user_email,
      accounts: '1 / 0',
      revenue: '$0',
      orders: '1',
      payouts: '$0',
    })
  }

  if (loading) {
    return (
      <section className="admin-page-stack">
        <div className="admin-dashboard-card">
          <h2>Support Tickets</h2>
          <p>Loading tickets...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="admin-page-stack">
        <div className="admin-dashboard-card">
          <h2>Support Tickets</h2>
          <p style={{ color: '#ef4444' }}>Error: {error}</p>
          <button onClick={loadTickets}>Retry</button>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Support Tickets</h2>
        <p>Manage unassigned and assigned tickets, and track unanswered tickets with SLA countdown.</p>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={() => setActiveTab('active')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeTab === 'active' ? '1px solid #f59e0b' : '1px solid #374151',
              background: activeTab === 'active' ? '#f59e0b' : '#111827',
              color: activeTab === 'active' ? '#111827' : '#fff',
              cursor: 'pointer',
              fontWeight: activeTab === 'active' ? 'bold' : 'normal',
            }}
          >
            Active Tickets
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeTab === 'history' ? '1px solid #f59e0b' : '1px solid #374151',
              background: activeTab === 'history' ? '#f59e0b' : '#111827',
              color: activeTab === 'history' ? '#111827' : '#fff',
              cursor: 'pointer',
              fontWeight: activeTab === 'history' ? 'bold' : 'normal',
            }}
          >
            History
          </button>
        </div>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Unassigned</h3>
          <strong>{unassignedTickets.length}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Assigned</h3>
          <strong>{assignedTickets.length}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Unanswered</h3>
          <strong>{unansweredTickets.length}</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <h3 style={{ color: '#fff' }}>Assigned Tickets</h3>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>User</th>
              <th>Subject</th>
              <th>Priority</th>
              <th>Created At</th>
              <th>Assigned To</th>
              <th>Unread</th>
            </tr>
          </thead>
          <tbody>
            {assignedTickets.map((ticket) => (
              <tr key={ticket.id} onClick={() => handleTicketClick(ticket)} style={{ cursor: 'pointer', opacity: ticket.status === 'closed' ? 0.6 : 1 }}>
                <td>{ticket.id}</td>
                <td>{ticket.user_name}</td>
                <td>{ticket.subject}</td>
                <td style={{ textTransform: 'capitalize' }}>{ticket.priority}</td>
                <td>{new Date(ticket.created_at).toLocaleString()}</td>
                <td>{ticket.assigned_to ?? '—'}</td>
                <td>
                  {ticket.user_unread_count > 0 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        minWidth: '24px',
                        height: '24px',
                        padding: '0 8px',
                        borderRadius: '999px',
                        background: '#ef4444',
                        color: '#fff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {ticket.user_unread_count}
                    </span>
                  ) : (
                    '0'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-table-card">
        <h3 style={{ color: '#fff' }}>Unassigned Tickets</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>User</th>
              <th>Subject</th>
              <th>Priority</th>
              <th>Created At</th>
              <th>Time Left</th>
            </tr>
          </thead>
          <tbody>
            {unassignedTickets.map((ticket) => (
              <tr key={ticket.id} onClick={() => handleTicketClick(ticket)} style={{ cursor: 'pointer' }}>
                <td>{ticket.id}</td>
                <td>{ticket.user_name}</td>
                <td>{ticket.subject}</td>
                <td style={{ textTransform: 'capitalize' }}>{ticket.priority}</td>
                <td>{new Date(ticket.created_at).toLocaleString()}</td>
                <td>{formatCountdown(ticket.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedChat && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '16px',
          }}
          onClick={() => setSelectedChat(null)}
        >
          <div
            style={{
              width: 'min(820px, 100%)',
              maxHeight: '85vh',
              overflow: 'auto',
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: '14px',
              padding: '16px',
              color: '#fff',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>{selectedChat.id} — {selectedChat.subject}</h3>
              <button type="button" onClick={() => setSelectedChat(null)}>Close</button>
            </div>

            <p style={{ marginTop: 0, color: '#cbd5e1' }}>
              User: {selectedChat.user_id} • Assigned to: {selectedChat.assigned_to ?? '—'}
            </p>

            {!selectedChat.assigned_to && (
              <p style={{ marginTop: 0, color: '#fbbf24' }}>
                Reply to this first message to move ticket into Assigned Tickets.
              </p>
            )}

            <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
              {selectedChat.messages.map((message: SupportMessage) => (
                <div
                  key={message.id}
                  style={{
                    alignSelf: message.sender === 'support' ? 'flex-end' : 'flex-start',
                    background: message.sender === 'support' ? '#f59e0b' : '#1f2937',
                    color: message.sender === 'support' ? '#111827' : '#fff',
                    border: '1px solid #374151',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    maxWidth: '80%',
                  }}
                >
                  <strong style={{ fontSize: '12px', textTransform: 'capitalize' }}>{message.sender}</strong>
                  {message.message && <p style={{ margin: '6px 0' }}>{message.message}</p>}
                  {message.image_url && (
                    <div style={{ margin: '6px 0' }}>
                      <img
                        src={message.image_url}
                        alt="Uploaded image"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                        onClick={() => message.image_url && window.open(message.image_url, '_blank')}
                      />
                    </div>
                  )}
                  <small style={{ opacity: 0.8 }}>{new Date(message.created_at).toLocaleString()}</small>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                placeholder="Type a support reply..."
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff' }}
                disabled={sending}
              />
              <button type="button" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => {
                const ticket = tickets.find(t => t.id === selectedChat.id)
                if (ticket) openProfile(ticket)
              }}>View User Profile</button>
              <button type="button" onClick={handleCloseTicket}>Close Ticket</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default SupportTicketsPage
