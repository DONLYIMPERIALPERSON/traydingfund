import { useMemo, useState } from 'react'
import './SettingsPage.css'

type SettingsTab = 'addAdmin' | 'admins'

type AdminAccount = {
  id: string
  name: string
  email: string
  role: string
  defaultPassword: string
  allowedPages: string[]
}

const availablePages = [
  'Analysis',
  'Work Board',
  'All Users',
  'KYC Review',
  'Affiliates',
  'Payout Requests',
  'Orders',
  'Financial Analysis & Settings',
  'Challenges',
  'Funded Accounts',
  'Breaches',
  'MT5',
  'Coupons',
  'Support Tickets',
  'Send Announcement',
  'Settings',
]

const initialAdmins: AdminAccount[] = [
  {
    id: 'ADM-1001',
    name: 'Support Agent',
    email: 'support.agent@nairatrader.com',
    role: 'Support Agent',
    defaultPassword: 'St9#pQ2xLm',
    allowedPages: ['Support Tickets', 'All Users', 'Settings'],
  },
  {
    id: 'ADM-1002',
    name: 'Finance Reviewer',
    email: 'finance.reviewer@nairatrader.com',
    role: 'Finance Admin',
    defaultPassword: 'Fn7!mK4rTp',
    allowedPages: ['Payout Requests', 'Orders', 'Financial Analysis & Settings'],
  },
]

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 10 })
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join('')
}

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('addAdmin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Support Agent')
  const [defaultPassword, setDefaultPassword] = useState(generatePassword())
  const [selectedPages, setSelectedPages] = useState<string[]>(['Support Tickets'])
  const [admins, setAdmins] = useState<AdminAccount[]>(initialAdmins)

  const totalAdmins = useMemo(() => admins.length, [admins])

  const togglePage = (page: string) => {
    setSelectedPages((prev) => (prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]))
  }

  const createAdmin = () => {
    if (!name.trim() || !email.trim() || selectedPages.length === 0) return

    const newAdmin: AdminAccount = {
      id: `ADM-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      defaultPassword,
      allowedPages: selectedPages,
    }

    setAdmins((prev) => [newAdmin, ...prev])
    setName('')
    setEmail('')
    setRole('Support Agent')
    setDefaultPassword(generatePassword())
    setSelectedPages(['Support Tickets'])
    setActiveTab('admins')
  }

  const deleteAdmin = (adminId: string) => {
    setAdmins((prev) => prev.filter((admin) => admin.id !== adminId))
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Settings</h2>
        <p>Manage internal admin access and create support/admin accounts with page-level permissions.</p>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Total Admins</h3>
          <strong>{totalAdmins}</strong>
        </article>
      </div>

      <div className="admin-dashboard-card settings-tabs">
        <button type="button" className="settings-tab-btn" onClick={() => setActiveTab('addAdmin')} disabled={activeTab === 'addAdmin'}>
          Add Admin
        </button>
        <button type="button" className="settings-tab-btn" onClick={() => setActiveTab('admins')} disabled={activeTab === 'admins'}>
          Admin List
        </button>
      </div>

      {activeTab === 'addAdmin' && (
        <div className="admin-dashboard-card settings-form-card">
          <h3 className="settings-title">Add Admin</h3>
          <div className="settings-form-grid">
            <label>
              Admin Name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Support Agent" />
            </label>

            <label>
              Admin Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="agent@nairatrader.com" />
            </label>

            <label>
              Role Name
              <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Support Agent" />
            </label>

            <label>
              Default Password
              <div className="settings-password-row">
                <input value={defaultPassword} readOnly />
                <button type="button" className="settings-generate-btn" onClick={() => setDefaultPassword(generatePassword())}>Generate</button>
              </div>
            </label>

            <div className="settings-pages-block">
              <p className="settings-pages-label">Allowed Pages</p>
              <div className="settings-pages-grid">
                {availablePages.map((page) => (
                  <label key={page} className="settings-page-item">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes(page)}
                      onChange={() => togglePage(page)}
                    />
                    {page}
                  </label>
                ))}
              </div>
            </div>

            <div className="settings-actions">
              <button type="button" className="settings-create-btn" onClick={createAdmin}>Create Admin</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="admin-table-card">
          <h3 className="settings-title">Admin Accounts</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Default Password</th>
                <th>Allowed Pages</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>{admin.role}</td>
                  <td>{admin.defaultPassword}</td>
                  <td>{admin.allowedPages.join(', ')}</td>
                  <td>
                    <button
                      type="button"
                      className="settings-delete-btn"
                      onClick={() => deleteAdmin(admin.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default SettingsPage
