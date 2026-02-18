import { useState } from 'react'
import type { AdminUser } from './UsersPage'
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

  const renderTabContent = () => {
    if (activeTab === 'View profile') {
      return (
        <div className="admin-profile-grid">
          <article>
            <h4>Identity</h4>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Status:</strong> Active</p>
          </article>
          <article>
            <h4>Account Snapshot</h4>
            <p><strong>Accounts:</strong> {user.accounts}</p>
            <p><strong>Revenue:</strong> {user.revenue}</p>
            <p><strong>Payouts:</strong> {user.payouts}</p>
          </article>
        </div>
      )
    }

    if (activeTab === 'View accounts') {
      return (
        <div className="admin-profile-table-wrap">
          <table className="admin-profile-table">
            <thead>
              <tr>
                <th>MT5</th>
                <th>Type</th>
                <th>Stage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>10293847</td><td>200k</td><td>Funded</td><td>Active</td></tr>
              <tr><td>10293855</td><td>100k</td><td>Challenge</td><td>Active</td></tr>
            </tbody>
          </table>
        </div>
      )
    }

    if (activeTab === 'KYC') {
      return (
        <div className="admin-profile-table-wrap">
          <table className="admin-profile-table">
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Date Passed</th>
                <th>10% Profit Made</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>10293847</td><td>2026-02-04</td><td>Passed</td><td>Auto Approved</td></tr>
              <tr><td>10293855</td><td>2026-02-10</td><td>Passed</td><td>Auto Approved</td></tr>
            </tbody>
          </table>
        </div>
      )
    }

    if (activeTab === 'View orders') {
      return (
        <div className="admin-profile-table-wrap">
          <table className="admin-profile-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Order ID</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>2026-02-08</td><td>ORD-7742</td><td>100k Challenge</td><td>₦320,000</td><td>Paid</td></tr>
              <tr><td>2026-01-26</td><td>ORD-7621</td><td>200k Challenge</td><td>₦540,000</td><td>Paid</td></tr>
            </tbody>
          </table>
        </div>
      )
    }

    if (activeTab === 'View payouts') {
      return (
        <div className="admin-profile-table-wrap">
          <table className="admin-profile-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>MT5</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>2026-02-11</td><td>10293847</td><td>₦150,000</td><td>Completed</td></tr>
              <tr><td>2026-02-16</td><td>10293847</td><td>₦90,000</td><td>Pending Review</td></tr>
            </tbody>
          </table>
        </div>
      )
    }

    if (activeTab === 'View tickets') {
      return (
        <div className="admin-profile-table-wrap">
          <table className="admin-profile-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>#SUP-401</td><td>Payout delay question</td><td>Medium</td><td>Open</td></tr>
              <tr><td>#SUP-366</td><td>MT5 login reset</td><td>Low</td><td>Resolved</td></tr>
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
            <select>
              <option>KYC Reminder</option>
              <option>Payout Approved</option>
              <option>Risk Warning</option>
            </select>
          </label>
          <label>
            Message Preview
            <textarea rows={5} defaultValue={`Hello ${user.name},\n\nWe are reaching out regarding your account update.`} />
          </label>
          <button type="button">Send Message</button>
        </div>
      )
    }

    if (activeTab === 'Add note / add tag') {
      return (
        <div className="admin-profile-form">
          <label>
            Internal Note
            <textarea rows={4} placeholder="Add internal compliance or support note..." />
          </label>
          <label>
            Tag
            <select>
              <option>VIP</option>
              <option>Manual Review</option>
              <option>Payout Priority</option>
            </select>
          </label>
          <button type="button">Save Note & Tag</button>
        </div>
      )
    }

    if (activeTab === 'Disable withdrawals / enable withdrawals') {
      return (
        <div className="admin-profile-actions">
          <p>Current withdrawal status: <strong>Enabled</strong></p>
          <div>
            <button type="button" className="danger">Disable Withdrawals</button>
            <button type="button">Enable Withdrawals</button>
          </div>
        </div>
      )
    }

    if (activeTab === 'Suspend user / unsuspend') {
      return (
        <div className="admin-profile-actions">
          <p>Current user status: <strong>Active</strong></p>
          <div>
            <button type="button" className="danger">Suspend User</button>
            <button type="button">Unsuspend User</button>
          </div>
        </div>
      )
    }

    return (
      <div className="admin-profile-actions">
        <p>Ban control for this user account.</p>
        <label>
          Reason
          <textarea rows={3} placeholder="Enter ban reason and duration..." />
        </label>
        <button type="button" className="danger">Ban User</button>
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
          <strong>{user.accounts}</strong>
        </article>
        <article>
          <span>Revenue</span>
          <strong>{user.revenue}</strong>
        </article>
        <article>
          <span>Orders</span>
          <strong>{user.orders}</strong>
        </article>
        <article>
          <span>Payouts</span>
          <strong>{user.payouts}</strong>
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
