import { useState, useEffect } from 'react'
import type { AdminUser } from './UsersPage'
import {
  fetchUserProfile,
  fetchUserChallengeAccounts,
  fetchUserOrders,
  fetchUserPayouts,
  fetchUserSupportTickets,
  disableUserWithdrawals,
  enableUserWithdrawals,
  suspendUser,
  unsuspendUser,
  banUser,
  addUserNote,
  sendUserEmail,
  type UserProfileData,
  type UserChallengeAccount,
  type UserOrder,
  type UserPayout,
  type UserSupportTicket,
} from '../lib/adminAuth'
import './UserProfilePage.css'

const profileTabs = [
  'View profile',
  'KYC',
  'View accounts',
  'View orders',
  'View payouts',
  'View tickets',
  'Send email / message (template)',
  'Add note / add tag',
  'Disable withdrawals / enable withdrawals',
  'Suspend user / unsuspend',
  'Ban user (with reason + duration)',
]

interface UserProfilePageProps {
  user: AdminUser
  onBack: () => void
}

const UserProfilePage = ({ user, onBack }: UserProfilePageProps) => {
  const [activeTab, setActiveTab] = useState(profileTabs[0])

  // Data states
  const [profileData, setProfileData] = useState<UserProfileData | null>(null)
  const [challengeAccounts, setChallengeAccounts] = useState<UserChallengeAccount[]>([])
  const [orders, setOrders] = useState<UserOrder[]>([])
  const [payouts, setPayouts] = useState<UserPayout[]>([])
  const [supportTickets, setSupportTickets] = useState<UserSupportTicket[]>([])

  // Loading states
  const [loading, setLoading] = useState<Record<string, boolean>>({
    profile: false,
    accounts: false,
    orders: false,
    payouts: false,
    tickets: false,
  })

  // Error states
  const [errors, setErrors] = useState<Record<string, string | null>>({
    profile: null,
    accounts: null,
    orders: null,
    payouts: null,
    tickets: null,
  })

  // Form states
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailTemplate, setEmailTemplate] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteTag, setNoteTag] = useState('')
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState('')

  const userId = user.user_id

  if (!userId) {
    return (
      <section className="admin-page-stack user-profile-page">
        <div className="admin-dashboard-card">
          <p>Error: User ID is missing</p>
          <button type="button" onClick={onBack}>← Back to Users</button>
        </div>
      </section>
    )
  }

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'View profile' && !profileData && !loading.profile) {
      loadProfile()
    } else if (activeTab === 'View accounts' && challengeAccounts.length === 0 && !loading.accounts) {
      loadChallengeAccounts()
    } else if (activeTab === 'View orders' && orders.length === 0 && !loading.orders) {
      loadOrders()
    } else if (activeTab === 'View payouts' && payouts.length === 0 && !loading.payouts) {
      loadPayouts()
    } else if (activeTab === 'View tickets' && supportTickets.length === 0 && !loading.tickets) {
      loadSupportTickets()
    }
  }, [activeTab])

  const loadProfile = async () => {
    try {
      setLoading(prev => ({ ...prev, profile: true }))
      setErrors(prev => ({ ...prev, profile: null }))
      const data = await fetchUserProfile(userId)
      setProfileData(data)
    } catch (err) {
      setErrors(prev => ({ ...prev, profile: err instanceof Error ? err.message : 'Failed to load profile' }))
    } finally {
      setLoading(prev => ({ ...prev, profile: false }))
    }
  }

  const loadChallengeAccounts = async () => {
    try {
      setLoading(prev => ({ ...prev, accounts: true }))
      setErrors(prev => ({ ...prev, accounts: null }))
      const data = await fetchUserChallengeAccounts(userId)
      setChallengeAccounts(data)
    } catch (err) {
      setErrors(prev => ({ ...prev, accounts: err instanceof Error ? err.message : 'Failed to load accounts' }))
    } finally {
      setLoading(prev => ({ ...prev, accounts: false }))
    }
  }

  const loadOrders = async () => {
    try {
      setLoading(prev => ({ ...prev, orders: true }))
      setErrors(prev => ({ ...prev, orders: null }))
      const data = await fetchUserOrders(userId)
      setOrders(data.orders)
    } catch (err) {
      setErrors(prev => ({ ...prev, orders: err instanceof Error ? err.message : 'Failed to load orders' }))
    } finally {
      setLoading(prev => ({ ...prev, orders: false }))
    }
  }

  const loadPayouts = async () => {
    try {
      setLoading(prev => ({ ...prev, payouts: true }))
      setErrors(prev => ({ ...prev, payouts: null }))
      const data = await fetchUserPayouts(userId)
      setPayouts(data.payouts)
    } catch (err) {
      setErrors(prev => ({ ...prev, payouts: err instanceof Error ? err.message : 'Failed to load payouts' }))
    } finally {
      setLoading(prev => ({ ...prev, payouts: false }))
    }
  }

  const loadSupportTickets = async () => {
    try {
      setLoading(prev => ({ ...prev, tickets: true }))
      setErrors(prev => ({ ...prev, tickets: null }))
      const data = await fetchUserSupportTickets(userId)
      // Filter tickets for this user by name/email
      const userTickets = data.filter(ticket =>
        ticket.user_name === user.name || ticket.user_email === user.email
      )
      setSupportTickets(userTickets)
    } catch (err) {
      setErrors(prev => ({ ...prev, tickets: err instanceof Error ? err.message : 'Failed to load tickets' }))
    } finally {
      setLoading(prev => ({ ...prev, tickets: false }))
    }
  }

  const handleSendEmail = async () => {
    try {
      await sendUserEmail(userId, emailSubject, emailMessage, emailTemplate)
      alert('Email sent successfully')
      setEmailSubject('')
      setEmailMessage('')
      setEmailTemplate('')
    } catch (err) {
      alert('Failed to send email')
    }
  }

  const handleAddNote = async () => {
    try {
      await addUserNote(userId, noteText, noteTag)
      alert('Note added successfully')
      setNoteText('')
      setNoteTag('')
    } catch (err) {
      alert('Failed to add note')
    }
  }

  const handleDisableWithdrawals = async () => {
    try {
      await disableUserWithdrawals(userId)
      alert('Withdrawals disabled successfully')
    } catch (err) {
      alert('Failed to disable withdrawals')
    }
  }

  const handleEnableWithdrawals = async () => {
    try {
      await enableUserWithdrawals(userId)
      alert('Withdrawals enabled successfully')
    } catch (err) {
      alert('Failed to enable withdrawals')
    }
  }

  const handleSuspendUser = async () => {
    const reason = prompt('Reason for suspension (optional):')
    try {
      await suspendUser(userId, reason || undefined)
      alert('User suspended successfully')
    } catch (err) {
      alert('Failed to suspend user')
    }
  }

  const handleUnsuspendUser = async () => {
    try {
      await unsuspendUser(userId)
      alert('User unsuspended successfully')
    } catch (err) {
      alert('Failed to unsuspend user')
    }
  }

  const handleBanUser = async () => {
    try {
      await banUser(userId, banReason, banDuration)
      alert('User banned successfully')
      setBanReason('')
      setBanDuration('')
    } catch (err) {
      alert('Failed to ban user')
    }
  }

  const renderTabContent = () => {
    if (activeTab === 'View profile') {
      if (loading.profile) return <div>Loading profile...</div>
      if (errors.profile) return <div className="error">Error: {errors.profile}</div>

      return (
        <div className="admin-profile-grid">
          <article>
            <h4>Identity</h4>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Status:</strong> {profileData?.status || 'Unknown'}</p>
          </article>
          <article>
            <h4>Account Snapshot</h4>
            <p><strong>Accounts:</strong> {profileData?.accounts || '—'}</p>
            <p><strong>Revenue:</strong> {profileData?.revenue || '—'}</p>
            <p><strong>Payouts:</strong> {profileData?.payouts || '—'}</p>
          </article>
        </div>
      )
    }

    if (activeTab === 'View accounts') {
      if (loading.accounts) return <div>Loading accounts...</div>
      if (errors.accounts) return <div className="error">Error: {errors.accounts}</div>

      return (
        <div className="admin-profile-table-wrap">
          <table className="admin-profile-table">
            <thead>
              <tr>
                <th>Challenge ID</th>
                <th>MT5 Account</th>
                <th>Account Size</th>
                <th>Account Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {challengeAccounts.map((account) => (
                <tr key={account.challenge_id}>
                  <td>{account.challenge_id}</td>
                  <td>{account.mt5_account || 'N/A'}</td>
                  <td>{account.account_size}</td>
                  <td>{account.phase}</td>
                  <td>{account.objective_status || 'Unknown'}</td>
                </tr>
              ))}
              {challengeAccounts.length === 0 && (
                <tr><td colSpan={5}>No challenge accounts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )
    }

    if (activeTab === 'KYC') {
      // Show KYC status from user profile
      const kycStatus = profileData?.kyc_status || 'Unknown'
      const kycStatusDisplay = kycStatus === 'active' ? 'Approved' :
                              kycStatus === 'pending' ? 'Pending Review' :
                              kycStatus === 'rejected' ? 'Rejected' :
                              kycStatus === 'not_started' ? 'Not Started' : kycStatus

      return (
        <div className="admin-profile-kyc">
          <div className="admin-profile-grid">
            <article>
              <h4>KYC Status</h4>
              <p><strong>Current Status:</strong>
                <span className={`kyc-status ${kycStatus.toLowerCase()}`}>
                  {kycStatusDisplay}
                </span>
              </p>
              <p><strong>User:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
            </article>
            <article>
              <h4>Account Eligibility</h4>
              <p><strong>Can Trade:</strong> {kycStatus === 'active' ? 'Yes' : 'No'}</p>
              <p><strong>Can Withdraw:</strong> {kycStatus === 'active' ? 'Yes' : 'No'}</p>
              <p><strong>Trading Status:</strong> {profileData?.trading || 'None'}</p>
            </article>
          </div>

          {challengeAccounts.length > 0 && (
            <div className="admin-profile-table-wrap">
              <h4>Trading Accounts</h4>
              <table className="admin-profile-table">
                <thead>
                  <tr>
                    <th>Challenge ID</th>
                    <th>Account Size</th>
                    <th>Phase</th>
                    <th>Status</th>
                    <th>KYC Required</th>
                  </tr>
                </thead>
                <tbody>
                  {challengeAccounts.map((account) => (
                    <tr key={account.challenge_id}>
                      <td>{account.challenge_id}</td>
                      <td>{account.account_size}</td>
                      <td>{account.phase}</td>
                      <td>{account.objective_status || 'Unknown'}</td>
                      <td>{account.phase === 'Funded' ? 'Completed' : 'In Progress'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )
    }

    if (activeTab === 'View orders') {
      if (loading.orders) return <div>Loading orders...</div>
      if (errors.orders) return <div className="error">Error: {errors.orders}</div>

      return (
        <div className="admin-profile-table-wrap">
          <table className="admin-profile-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Order ID</th>
                <th>Account Size</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td>{order.provider_order_id}</td>
                  <td>{order.account_size}</td>
                  <td>{order.net_amount_formatted}</td>
                  <td>{order.status}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5}>No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )
    }

    if (activeTab === 'View payouts') {
      if (loading.payouts) return <div>Loading payouts...</div>
      if (errors.payouts) return <div className="error">Error: {errors.payouts}</div>

      return (
        <div className="admin-profile-table-wrap">
          <table className="admin-profile-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Challenge ID</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{payout.created_at ? new Date(payout.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td>{payout.account.challenge_id}</td>
                  <td>{payout.amount_formatted}</td>
                  <td>{payout.status}</td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr><td colSpan={4}>No payouts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )
    }

    if (activeTab === 'View tickets') {
      if (loading.tickets) return <div>Loading tickets...</div>
      if (errors.tickets) return <div className="error">Error: {errors.tickets}</div>

      return (
        <div className="admin-profile-table-wrap">
          <table className="admin-profile-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {supportTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td>
                  <td>{ticket.subject}</td>
                  <td>{ticket.priority}</td>
                  <td>{ticket.status}</td>
                  <td>{new Date(ticket.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {supportTickets.length === 0 && (
                <tr><td colSpan={5}>No support tickets found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )
    }

    if (activeTab === 'Send email / message (template)') {
      return (
        <div className="admin-profile-form">
          <label>
            Template
            <select value={emailTemplate} onChange={(e) => setEmailTemplate(e.target.value)}>
              <option value="">Custom Message</option>
              <option value="kyc_reminder">KYC Reminder</option>
              <option value="payout_approved">Payout Approved</option>
              <option value="risk_warning">Risk Warning</option>
            </select>
          </label>
          <label>
            Subject
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject"
            />
          </label>
          <label>
            Message
            <textarea
              rows={5}
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Email message content"
            />
          </label>
          <button type="button" onClick={handleSendEmail}>Send Email</button>
        </div>
      )
    }

    if (activeTab === 'Add note / add tag') {
      return (
        <div className="admin-profile-form">
          <label>
            Internal Note
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add internal compliance or support note..."
            />
          </label>
          <label>
            Tag
            <select value={noteTag} onChange={(e) => setNoteTag(e.target.value)}>
              <option value="">No Tag</option>
              <option value="VIP">VIP</option>
              <option value="Manual Review">Manual Review</option>
              <option value="Payout Priority">Payout Priority</option>
            </select>
          </label>
          <button type="button" onClick={handleAddNote}>Save Note & Tag</button>
        </div>
      )
    }

    if (activeTab === 'Disable withdrawals / enable withdrawals') {
      return (
        <div className="admin-profile-actions">
          <p>Current withdrawal status: <strong>Enabled</strong></p>
          <div>
            <button type="button" className="danger" onClick={handleDisableWithdrawals}>Disable Withdrawals</button>
            <button type="button" onClick={handleEnableWithdrawals}>Enable Withdrawals</button>
          </div>
        </div>
      )
    }

    if (activeTab === 'Suspend user / unsuspend') {
      return (
        <div className="admin-profile-actions">
          <p>Current user status: <strong>{profileData?.status || 'Active'}</strong></p>
          <div>
            <button type="button" className="danger" onClick={handleSuspendUser}>Suspend User</button>
            <button type="button" onClick={handleUnsuspendUser}>Unsuspend User</button>
          </div>
        </div>
      )
    }

    return (
      <div className="admin-profile-actions">
        <p>Ban control for this user account.</p>
        <label>
          Reason
          <textarea
            rows={3}
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Enter ban reason..."
          />
        </label>
        <label>
          Duration (optional)
          <input
            type="text"
            value={banDuration}
            onChange={(e) => setBanDuration(e.target.value)}
            placeholder="e.g., 30 days, permanent"
          />
        </label>
        <button type="button" className="danger" onClick={handleBanUser}>Ban User</button>
      </div>
    )
  }

  return (
    <section className="admin-page-stack user-profile-page">
      <div className="admin-dashboard-card user-profile-header">
        <button type="button" className="user-profile-back-btn" onClick={onBack}>← Back to Users</button>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
      </div>

      <div className="admin-dashboard-card user-profile-summary">
        <article>
          <span>Accounts</span>
          <strong>{profileData?.accounts || '—'}</strong>
        </article>
        <article>
          <span>Revenue</span>
          <strong>{profileData?.revenue || '—'}</strong>
        </article>
        <article>
          <span>Orders</span>
          <strong>{profileData?.orders || '—'}</strong>
        </article>
        <article>
          <span>Payouts</span>
          <strong>{profileData?.payouts || '—'}</strong>
        </article>
      </div>

      <div className="admin-dashboard-card user-profile-tabs-card">
        <div className="user-profile-tabs">
          {profileTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="user-profile-tab-panel">
          <h3>{activeTab}</h3>
          {renderTabContent()}
        </div>
      </div>
    </section>
  )
}

export default UserProfilePage
