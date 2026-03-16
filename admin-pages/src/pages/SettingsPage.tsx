import { useEffect, useMemo, useState } from 'react'
import {
  fetchAdminAllowlist,
  createAdminAllowlistEntry,
  updateAdminAllowlistEntry,
  deleteAdminAllowlistEntry,
  type AdminAllowlistEntry,
} from '../lib/adminMock'
import './SettingsPage.css'

type SettingsTab = 'addAdmin' | 'admins'

// Map page IDs to display names
const pageIdToDisplayName: Record<string, string> = {
  analysis: 'Analysis',
  workBoard: 'Work Board',
  users: 'All Users',
  kycReview: 'KYC Review',
  referrals: 'Affiliates',
  payouts: 'Payout Requests',
  orders: 'Orders',
  salary: 'Salary',
  financeAnalysis: 'Financial Analysis & Settings',
  accounts: 'Challenges',
  fundedAccounts: 'Funded Accounts',
  breaches: 'Breaches',
  mt5: 'cTrader',
  coupons: 'Coupons',
  supportTickets: 'Support Tickets',
  sendAnnouncement: 'Send Announcement',
  settings: 'Settings',
}

const displayNameToPageId: Record<string, string> = Object.fromEntries(
  Object.entries(pageIdToDisplayName).map(([id, name]) => [name, id])
)

const availablePages = Object.values(pageIdToDisplayName)

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('addAdmin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin')
  const [requireMfa, setRequireMfa] = useState(true)
  const [canAssignMt5, setCanAssignMt5] = useState(false)
  const [selectedPages, setSelectedPages] = useState<string[]>(['Support Tickets'])
  const [admins, setAdmins] = useState<AdminAllowlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminAllowlistEntry | null>(null)
  const [editingPages, setEditingPages] = useState<string[]>([])
  const [editingCanAssignMt5, setEditingCanAssignMt5] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingAdminId, setDeletingAdminId] = useState<number | null>(null)

  const totalAdmins = useMemo(() => admins.length, [admins])

  useEffect(() => {
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetchAdminAllowlist()
      setAdmins(response.admins)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admins')
    } finally {
      setLoading(false)
    }
  }

  const togglePage = (page: string) => {
    setSelectedPages((prev) => (prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]))
  }

  const createAdmin = async () => {
    if (!name.trim() || !email.trim() || selectedPages.length === 0) return

    try {
      setSubmitting(true)
      setError('')

      const pageIds = selectedPages.map(displayName => displayNameToPageId[displayName]).filter(Boolean)

      await createAdminAllowlistEntry({
        email: email.trim().toLowerCase(),
        full_name: name.trim(),
        role,
        require_mfa: requireMfa,
        can_assign_mt5: canAssignMt5,
        allowed_pages: pageIds,
      })

      // Reload admins
      await loadAdmins()

      // Reset form
      setName('')
      setEmail('')
      setRole('admin')
      setRequireMfa(true)
      setCanAssignMt5(false)
      setSelectedPages(['Support Tickets'])
      setActiveTab('admins')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setSubmitting(false)
    }
  }

  const updateAdmin = async (adminId: number, updates: {
    full_name?: string
    role?: 'admin' | 'super_admin'
    status?: 'active' | 'disabled'
    require_mfa?: boolean
    allowed_pages?: string[]
    can_assign_mt5?: boolean
  }) => {
    try {
      setError('')
      await updateAdminAllowlistEntry(adminId, updates)
      await loadAdmins()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update admin')
    }
  }

  const getAllowedPagesDisplay = (allowedPages: string[] | null) => {
    if (!allowedPages || allowedPages.length === 0) return 'All Pages'
    return allowedPages.map(pageId => pageIdToDisplayName[pageId] || pageId).join(', ')
  }

  const openEditModal = (admin: AdminAllowlistEntry) => {
    const currentPages = admin.allowed_pages && admin.allowed_pages.length > 0
      ? admin.allowed_pages.map((pageId) => pageIdToDisplayName[pageId] || pageId)
      : [...availablePages]
    setEditingPages(currentPages)
    setEditingCanAssignMt5(Boolean(admin.can_assign_mt5))
    setEditingAdmin(admin)
  }

  const toggleEditingPage = (page: string) => {
    setEditingPages((prev) => (prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]))
  }

  const saveEditedPages = async () => {
    if (!editingAdmin) return
    setSavingEdit(true)
    setError('')

    try {
      const pageIds = editingPages
        .map((displayName) => displayNameToPageId[displayName])
        .filter(Boolean)

      const allowedPages = editingPages.length === availablePages.length ? [] : pageIds
      await updateAdminAllowlistEntry(editingAdmin.id, {
        allowed_pages: allowedPages,
        can_assign_mt5: editingCanAssignMt5,
      })
      await loadAdmins()
      setEditingAdmin(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update admin pages')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteAdmin = async (admin: AdminAllowlistEntry) => {
    const confirmDelete = window.confirm(`Delete admin ${admin.email}? This cannot be undone.`)
    if (!confirmDelete) return

    setDeletingAdminId(admin.id)
    setError('')
    try {
      await deleteAdminAllowlistEntry(admin.id)
      await loadAdmins()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete admin')
    } finally {
      setDeletingAdminId(null)
    }
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Settings</h2>
        <p>Manage internal admin access and create support/admin accounts with page-level permissions.</p>
        {error && <p style={{ color: '#fca5a5', marginTop: 8 }}>{error}</p>}
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Total Admins</h3>
          <strong>{loading ? '...' : totalAdmins}</strong>
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
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="agent@$trader.com" />
            </label>

            <label>
              Role
              <select value={role} onChange={(event) => setRole(event.target.value as 'admin' | 'super_admin')}>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>

            <label className="settings-checkbox-label">
              <input
                type="checkbox"
                checked={requireMfa}
                onChange={(event) => setRequireMfa(event.target.checked)}
              />
              Require MFA
            </label>

            <label className="settings-checkbox-label">
              <input
                type="checkbox"
                checked={canAssignMt5}
                onChange={(event) => setCanAssignMt5(event.target.checked)}
              />
              Allow cTrader Assign
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
              <button type="button" className="settings-create-btn" onClick={createAdmin} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="admin-table-card">
          <h3 className="settings-title">Admin Accounts</h3>
          {loading ? (
            <p>Loading admins...</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>MFA Required</th>
                  <th>cTrader Assign</th>
                  <th>Allowed Pages</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.full_name || 'N/A'}</td>
                    <td>{admin.email}</td>
                    <td style={{ textTransform: 'capitalize' }}>{admin.role.replace('_', ' ')}</td>
                    <td>
                      <select
                        value={admin.status}
                        onChange={(event) => updateAdmin(admin.id, { status: event.target.value as 'active' | 'disabled' })}
                        style={{ fontSize: '12px', padding: '2px 4px' }}
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={admin.require_mfa}
                        onChange={(event) => updateAdmin(admin.id, { require_mfa: event.target.checked })}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(admin.can_assign_mt5)}
                        onChange={(event) => updateAdmin(admin.id, { can_assign_mt5: event.target.checked })}
                      />
                    </td>
                    <td>{getAllowedPagesDisplay(admin.allowed_pages)}</td>
                    <td>
                      <button
                        type="button"
                        className="settings-edit-btn"
                        onClick={() => openEditModal(admin)}
                      >
                        Edit Pages
                      </button>
                      <button
                        type="button"
                        className="settings-delete-btn"
                        onClick={() => void handleDeleteAdmin(admin)}
                        disabled={deletingAdminId === admin.id}
                        style={{ marginLeft: 8, opacity: deletingAdminId === admin.id ? 0.7 : 1 }}
                      >
                        {deletingAdminId === admin.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editingAdmin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: 'min(100%, 520px)',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.16)',
              background: '#0f131b',
              color: '#fff',
              padding: 16,
              display: 'grid',
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Edit Allowed Pages</h3>
              <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: 13 }}>{editingAdmin.email}</p>
            </div>

            <div className="settings-pages-block">
              <p className="settings-pages-label">Allowed Pages</p>
              <div className="settings-pages-grid">
                {availablePages.map((page) => (
                  <label key={page} className="settings-page-item">
                    <input
                      type="checkbox"
                      checked={editingPages.includes(page)}
                      onChange={() => toggleEditingPage(page)}
                    />
                    {page}
                  </label>
                ))}
              </div>
            </div>

            <label className="settings-checkbox-label" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={editingCanAssignMt5}
                onChange={(event) => setEditingCanAssignMt5(event.target.checked)}
              />
              Allow cTrader Assign
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="settings-tab-btn"
                onClick={() => setEditingAdmin(null)}
                style={{ background: 'transparent' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="settings-create-btn"
                onClick={() => void saveEditedPages()}
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default SettingsPage
