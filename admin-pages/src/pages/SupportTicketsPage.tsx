import { useEffect, useMemo, useState } from 'react'
import type { AdminUser } from './UsersPage'

type Ticket = {
  id: string
  user: string
  subject: string
  priority: 'Low' | 'Medium' | 'High'
  createdAt: string
  assignedTo?: string
  answered: boolean
  unreadCount: number
  closed: boolean
  messages: Array<{
    id: string
    sender: 'User' | 'Support'
    text: string
    time: string
  }>
}

const initialTickets: Ticket[] = [
  {
    id: 'TK-1001', user: 'Favour M.', subject: 'KYC upload not working', priority: 'High', createdAt: '2026-02-17T10:00:00', answered: false, unreadCount: 0, closed: false,
    messages: [
      { id: 'm1', sender: 'User', text: 'I cannot upload my ID card on KYC page.', time: '2026-02-17 10:01' },
    ],
  },
  {
    id: 'TK-1002', user: 'Chinedu A.', subject: 'Challenge reset request', priority: 'Medium', createdAt: '2026-02-17T13:25:00', answered: false, unreadCount: 0, closed: false,
    messages: [
      { id: 'm1', sender: 'User', text: 'Please I need a reset for account CH-93220.', time: '2026-02-17 13:27' },
    ],
  },
  {
    id: 'TK-1003', user: 'Grace O.', subject: 'Payout delay question', priority: 'High', createdAt: '2026-02-16T21:40:00', assignedTo: 'Agent Tolu', answered: false, unreadCount: 3, closed: false,
    messages: [
      { id: 'm1', sender: 'User', text: 'My payout is still pending after 3 days.', time: '2026-02-16 21:42' },
      { id: 'm2', sender: 'Support', text: 'Thanks, we are checking with finance team.', time: '2026-02-16 22:10' },
      { id: 'm3', sender: 'User', text: 'Any update yet?', time: '2026-02-17 09:05' },
    ],
  },
  {
    id: 'TK-1004', user: 'Kelvin D.', subject: 'Coupon not applying', priority: 'Low', createdAt: '2026-02-16T09:10:00', assignedTo: 'Agent Chioma', answered: true, unreadCount: 0, closed: false,
    messages: [
      { id: 'm1', sender: 'User', text: 'Coupon WELCOME10 says invalid.', time: '2026-02-16 09:11' },
      { id: 'm2', sender: 'Support', text: 'Please try again now, it has been fixed.', time: '2026-02-16 09:23' },
    ],
  },
  {
    id: 'TK-1005', user: 'Ngozi R.', subject: 'MT5 login issue', priority: 'High', createdAt: '2026-02-17T08:45:00', assignedTo: 'Agent Tolu', answered: false, unreadCount: 5, closed: false,
    messages: [
      { id: 'm1', sender: 'User', text: 'I cannot log in to MT5 with sent credentials.', time: '2026-02-17 08:46' },
      { id: 'm2', sender: 'Support', text: 'Kindly confirm your server and account number.', time: '2026-02-17 08:55' },
      { id: 'm3', sender: 'User', text: 'Server is MT5-Live-01 and account 10314521.', time: '2026-02-17 09:00' },
    ],
  },
  {
    id: 'TK-1006', user: 'Amina Y.', subject: 'Wrong account balance', priority: 'Medium', createdAt: '2026-02-17T07:05:00', answered: false, unreadCount: 0, closed: false,
    messages: [
      { id: 'm1', sender: 'User', text: 'My dashboard shows wrong balance after trade.', time: '2026-02-17 07:08' },
    ],
  },
]

interface SupportTicketsPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const SupportTicketsPage = ({ onOpenProfile }: SupportTicketsPageProps) => {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [now, setNow] = useState(Date.now())
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const unassignedTickets = useMemo(() => tickets.filter((ticket) => !ticket.assignedTo), [tickets])
  const assignedTickets = useMemo(() => tickets.filter((ticket) => Boolean(ticket.assignedTo)), [tickets])
  const unansweredTickets = useMemo(() => tickets.filter((ticket) => !ticket.answered && !ticket.assignedTo), [tickets])
  const selectedTicket = useMemo(() => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null, [tickets, selectedTicketId])

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

  const handleSendMessage = () => {
    if (!selectedTicket || !newMessage.trim()) return

    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === selectedTicket.id
          ? {
              ...ticket,
              answered: true,
              assignedTo: ticket.assignedTo ?? 'Agent Admin',
              unreadCount: 0,
              messages: [
                ...ticket.messages,
                {
                  id: `m${ticket.messages.length + 1}`,
                  sender: 'Support',
                  text: newMessage.trim(),
                  time: new Date().toISOString().slice(0, 16).replace('T', ' '),
                },
              ],
            }
          : ticket,
      ),
    )

    setNewMessage('')
  }

  const handleCloseTicket = () => {
    if (!selectedTicket) return

    setTickets((prev) => prev.map((ticket) => (ticket.id === selectedTicket.id ? { ...ticket, closed: true } : ticket)))
    setSelectedTicketId(null)
  }

  const openProfile = (ticket: Ticket) => {
    onOpenProfile({
      name: ticket.user,
      email: `${ticket.user.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')}@mail.com`,
      accounts: '1 / 0',
      revenue: '₦0',
      orders: '1',
      payouts: '₦0',
    })
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Support Tickets</h2>
        <p>Manage unassigned and assigned tickets, and track unanswered tickets with SLA countdown.</p>
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
              <tr key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} style={{ cursor: 'pointer', opacity: ticket.closed ? 0.6 : 1 }}>
                <td>{ticket.id}</td>
                <td>{ticket.user}</td>
                <td>{ticket.subject}</td>
                <td>{ticket.priority}</td>
                <td>{ticket.createdAt.replace('T', ' ')}</td>
                <td>{ticket.assignedTo ?? '—'}</td>
                <td>
                  {ticket.unreadCount > 0 ? (
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
                      {ticket.unreadCount}
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
        <h3 style={{ color: '#fff' }}>Unanswered Tickets</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>User</th>
              <th>Subject</th>
              <th>Created At</th>
              <th>Time Left</th>
            </tr>
          </thead>
          <tbody>
            {unansweredTickets.map((ticket) => (
              <tr key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} style={{ cursor: 'pointer' }}>
                <td>{ticket.id}</td>
                <td>{ticket.user}</td>
                <td>{ticket.subject}</td>
                <td>{ticket.createdAt.replace('T', ' ')}</td>
                <td>{formatCountdown(ticket.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTicket && (
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
          onClick={() => setSelectedTicketId(null)}
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
              <h3 style={{ margin: 0 }}>{selectedTicket.id} — {selectedTicket.subject}</h3>
              <button type="button" onClick={() => setSelectedTicketId(null)}>Close</button>
            </div>

            <p style={{ marginTop: 0, color: '#cbd5e1' }}>
              User: {selectedTicket.user} • Assigned to: {selectedTicket.assignedTo ?? '—'}
            </p>

            {!selectedTicket.assignedTo && (
              <p style={{ marginTop: 0, color: '#fbbf24' }}>
                Reply to this first message to move ticket into Assigned Tickets.
              </p>
            )}

            <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
              {selectedTicket.messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    alignSelf: message.sender === 'Support' ? 'flex-end' : 'flex-start',
                    background: message.sender === 'Support' ? '#f59e0b' : '#1f2937',
                    color: message.sender === 'Support' ? '#111827' : '#fff',
                    border: '1px solid #374151',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    maxWidth: '80%',
                  }}
                >
                  <strong style={{ fontSize: '12px' }}>{message.sender}</strong>
                  <p style={{ margin: '6px 0' }}>{message.text}</p>
                  <small style={{ opacity: 0.8 }}>{message.time}</small>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                placeholder="Type a support reply..."
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff' }}
              />
              <button type="button" onClick={handleSendMessage}>Send Message</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => openProfile(selectedTicket)}>View User Profile</button>
              <button type="button" onClick={handleCloseTicket}>Close Ticket</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default SupportTicketsPage
