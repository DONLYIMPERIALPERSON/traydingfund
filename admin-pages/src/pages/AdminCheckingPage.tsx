import { useState } from 'react'
import {
  adminResetAccount,
  lookupChallengeAccount,
  type AdminLookupAccount,
} from '../lib/adminApi'
import { formatAccountSize } from '../lib/formatters'

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

const resolveResetStatus = (account?: AdminLookupAccount | null) => {
  if (!account) return '—'
  if (account.status?.toLowerCase() === 'admin_checking') return 'Pending'
  if (account.last_feed_at) return 'Completed'
  return 'Pending'
}

const AdminCheckingPage = () => {
  const [accountNumber, setAccountNumber] = useState('')
  const [account, setAccount] = useState<AdminLookupAccount | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [reportOpen, setReportOpen] = useState(false)

  const handleLookup = async () => {
    const trimmed = accountNumber.trim()
    if (!trimmed) {
      setError('Enter an account number to search.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await lookupChallengeAccount(trimmed)
      setAccount(response.account)
      setReportOpen(false)
    } catch (err) {
      setAccount(null)
      setError(err instanceof Error ? err.message : 'Account lookup failed')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!account) return
    setResetting(true)
    setError('')
    try {
      await adminResetAccount({ account_id: account.id, account_number: account.account_number })
      setAccount((prev) => (prev ? { ...prev, status: 'admin_checking' } : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset request failed')
    } finally {
      setResetting(false)
    }
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Admin Checking</h2>
        <p>Request fresh metrics for a specific account, monitor completion status, and review breach reports.</p>
      </div>

      <div className="admin-table-card" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Enter account number"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
            style={{
              border: '1px solid #2a2f3a',
              background: '#0f172a',
              color: '#e5e7eb',
              borderRadius: 10,
              padding: '10px 12px',
              minWidth: 240,
            }}
          />
          <button type="button" onClick={handleLookup} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button type="button" onClick={handleReset} disabled={!account || resetting}>
            {resetting ? 'Requesting...' : 'Request Reset'}
          </button>
        </div>

        {error && <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>}

        {account && (
          <div style={{
            background: '#0b1220',
            border: '1px solid #1f2937',
            borderRadius: 12,
            padding: 16,
            display: 'grid',
            gap: 12,
          }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <strong style={{ color: '#f8fafc' }}>Account Details</strong>
              <div style={{ color: '#cbd5f5', display: 'grid', gap: 4 }}>
                <span>Challenge ID: {account.challenge_id}</span>
                <span>Account Number: {account.account_number}</span>
                <span>Trader: {account.trader_name ?? '—'} ({account.trader_email ?? '—'})</span>
                <span>Account Size: {formatAccountSize(account.account_size, account.currency)}</span>
                <span>Phase: {account.phase}</span>
                <span>Status: {account.status}</span>
                <span>Last Feed: {formatDateTime(account.last_feed_at)}</span>
                <span>Reset Status: {resolveResetStatus(account)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setReportOpen((prev) => !prev)}
                style={{
                  background: '#111827',
                  border: '1px solid #334155',
                  color: '#facc15',
                }}
              >
                {reportOpen ? 'Hide Report' : 'View Report'}
              </button>
            </div>

            {reportOpen && (
              <div style={{
                borderTop: '1px solid #1f2937',
                paddingTop: 12,
                color: '#e2e8f0',
              }}>
                <p style={{ margin: 0 }}><strong>Breach Reason:</strong> {account.breach_reason ?? 'No breach recorded'}</p>
                <p style={{ margin: '4px 0 0' }}><strong>Breached At:</strong> {formatDateTime(account.breached_at)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminCheckingPage