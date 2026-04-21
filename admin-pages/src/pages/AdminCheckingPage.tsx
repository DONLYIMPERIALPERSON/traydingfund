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

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const renderValue = (key: string, value: unknown): string => {
  if (value == null) return '—'

  if ((key === 'time_ms' || key === 'closed_time_ms' || key.endsWith('_time_ms')) && typeof value === 'number') {
    return formatDateTime(new Date(value).toISOString())
  }

  if ((key === 'minutes_after_breach' || key === 'duration_min' || key.endsWith('_duration_min')) && typeof value === 'number') {
    return value.toFixed(4)
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const renderKeyValueBlock = (data: Record<string, unknown>) => (
  <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
    {Object.entries(data).map(([key, value]) => {
      if (isPlainObject(value)) {
        return (
          <div key={key} style={{ fontSize: 13, padding: 8, borderRadius: 8, background: '#111827' }}>
            <div style={{ color: '#93c5fd', marginBottom: 4 }}>{key.replace(/_/g, ' ')}</div>
            {renderKeyValueBlock(value)}
          </div>
        )
      }

      if (Array.isArray(value)) {
        return (
          <div key={key} style={{ fontSize: 13 }}>
            <span style={{ color: '#93c5fd' }}>{key.replace(/_/g, ' ')}:</span> {value.map((item) => String(item)).join(', ')}
          </div>
        )
      }

      return (
        <div key={key} style={{ fontSize: 13 }}>
          <span style={{ color: '#93c5fd' }}>{key.replace(/_/g, ' ')}:</span> {renderValue(key, value)}
        </div>
      )
    })}
  </div>
)

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

  const formatCurrency = (value: number | null | undefined, currency?: string | null) => {
    if (value == null) return '—'
    const normalized = currency?.toUpperCase() === 'NGN' ? 'NGN' : 'USD'
    if (normalized === 'NGN') {
      return `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatBreachTime = (account?: AdminLookupAccount | null) => {
    if (!account) return '—'
    const event = account.breach_event
    if (event && typeof event === 'object') {
      const timeMs = (event as Record<string, unknown>).time_ms
        ?? (event as Record<string, unknown>).closed_time_ms
        ?? (event as Record<string, unknown>).timestamp_ms
      if (typeof timeMs === 'number' && Number.isFinite(timeMs)) {
        return formatDateTime(new Date(timeMs).toISOString())
      }
      if (typeof timeMs === 'string') {
        const parsed = Number(timeMs)
        if (Number.isFinite(parsed)) return formatDateTime(new Date(parsed).toISOString())
      }
      const isoCandidate = (event as Record<string, unknown>).time
        ?? (event as Record<string, unknown>).timestamp
      if (typeof isoCandidate === 'string') {
        return formatDateTime(isoCandidate)
      }
    }
    return formatDateTime(account.breached_at)
  }

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
                <div style={{ display: 'grid', gap: 6 }}>
                  <div><strong>Reason:</strong> {account.breach_reason ?? 'No breach recorded'}</div>
                  <div><strong>Breach Time:</strong> {formatBreachTime(account)}</div>
                  <div><strong>Account Peak:</strong> {formatCurrency(account.highest_balance, account.currency)}</div>
                  <div><strong>Equity Low:</strong> {formatCurrency(account.daily_low_equity ?? account.min_equity, account.currency)}</div>
                  <div><strong>Daily High:</strong> {formatCurrency(account.daily_high_balance, account.currency)}</div>
                  <div><strong>Daily Breach Balance:</strong> {formatCurrency(account.daily_breach_balance, account.currency)}</div>
                  <div><strong>Max Breach Balance:</strong> {formatCurrency(account.breach_balance, account.currency)}</div>
                </div>
                {account.breach_event && (
                  <div style={{ marginTop: 10 }}>
                    <strong>Trigger Event</strong>
                    {isPlainObject(account.breach_event)
                      ? renderKeyValueBlock(account.breach_event)
                      : <div style={{ marginTop: 6, fontSize: 13 }}>{String(account.breach_event)}</div>}
                  </div>
                )}
                {Array.isArray(account.trade_duration_violations) && account.trade_duration_violations.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <strong>Trade Duration Violations</strong>
                    <div style={{ marginTop: 6, display: 'grid', gap: 8 }}>
                      {account.trade_duration_violations.slice(0, 3).map((violation, index) => (
                        <div key={`violation-${index}`} style={{ fontSize: 13, padding: 8, borderRadius: 8, background: '#111827' }}>
                          {isPlainObject(violation)
                            ? renderKeyValueBlock(violation)
                            : String(violation)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminCheckingPage