import { useState } from 'react'
import {
  adminReplaceAccount,
  adminUpdateMt5Password,
  adminResetAccount,
  clearUserPaymentMethod,
  lookupChallengeAccount,
  lookupUserPaymentMethod,
  type AdminLookupAccount,
  type AdminUserPaymentMethod,
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

  if ((key === 'floating_pnl' || key === 'floating_pnl_at_breach' || key.endsWith('_pnl')) && typeof value === 'number') {
    return value.toFixed(2)
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
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
        const objectItems = value.filter(isPlainObject)
        if (objectItems.length === value.length) {
          return (
            <div key={key} style={{ fontSize: 13, padding: 10, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' }}>
              <div style={{ color: '#93c5fd', marginBottom: 8, fontWeight: 700 }}>{key.replace(/_/g, ' ')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {objectItems.map((item, index) => (
                  <div
                    key={`${key}-${index}`}
                    style={{
                      minWidth: 180,
                      flex: '1 1 220px',
                      padding: 10,
                      borderRadius: 10,
                      background: '#111827',
                      border: '1px solid #334155',
                    }}
                  >
                    <div style={{ color: '#cbd5f5', marginBottom: 6, fontWeight: 700 }}>#{index + 1}</div>
                    {renderKeyValueBlock(item)}
                  </div>
                ))}
              </div>
            </div>
          )
        }

        return (
          <div key={key} style={{ fontSize: 13 }}>
            <span style={{ color: '#93c5fd' }}>{key.replace(/_/g, ' ')}:</span> {value.map((item) => renderValue(key, item)).join(', ')}
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
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [replacingAccount, setReplacingAccount] = useState(false)
  const [error, setError] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [newMt5Password, setNewMt5Password] = useState('')
  const [replacementPlatform, setReplacementPlatform] = useState<'mt5' | 'ctrader'>('mt5')
  const [replaceToNextPhase, setReplaceToNextPhase] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [paymentEmail, setPaymentEmail] = useState('')
  const [paymentLookupLoading, setPaymentLookupLoading] = useState(false)
  const [clearingPaymentMethod, setClearingPaymentMethod] = useState(false)
  const [paymentMethodUser, setPaymentMethodUser] = useState<AdminUserPaymentMethod | null>(null)

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

  const handleUpdateMt5Password = async () => {
    if (!account) return
    const password = newMt5Password.trim()
    if (!password) {
      setError('Enter the new MT5 password first.')
      return
    }
    setUpdatingPassword(true)
    setError('')
    try {
      await adminUpdateMt5Password({
        account_id: account.id,
        account_number: account.account_number,
        mt5_password: password,
      })
      setNewMt5Password('')
      setShowPasswordModal(false)
      const refreshed = await lookupChallengeAccount(account.account_number)
      setAccount(refreshed.account)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password update failed')
    } finally {
      setUpdatingPassword(false)
    }
  }

  const handleReplaceAccount = async () => {
    if (!account) return
    setReplacingAccount(true)
    setError('')
    try {
      await adminReplaceAccount({
        account_id: account.id,
        account_number: account.account_number,
        platform: replacementPlatform,
        next_phase: replaceToNextPhase,
      })
      setShowReplaceModal(false)
      const refreshed = await lookupChallengeAccount(account.account_number)
      setAccount(refreshed.account)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Replace account failed')
    } finally {
      setReplacingAccount(false)
    }
  }

  const handlePaymentLookup = async () => {
    const trimmed = paymentEmail.trim()
    if (!trimmed) {
      setError('Enter an email to search payout method.')
      return
    }
    setPaymentLookupLoading(true)
    setError('')
    try {
      const response = await lookupUserPaymentMethod(trimmed)
      setPaymentMethodUser(response.user)
    } catch (err) {
      setPaymentMethodUser(null)
      setError(err instanceof Error ? err.message : 'Payment method lookup failed')
    } finally {
      setPaymentLookupLoading(false)
    }
  }

  const handleClearPaymentMethod = async () => {
    if (!paymentMethodUser?.email) return
    setClearingPaymentMethod(true)
    setError('')
    try {
      await clearUserPaymentMethod(paymentMethodUser.email)
      const refreshed = await lookupUserPaymentMethod(paymentMethodUser.email)
      setPaymentMethodUser(refreshed.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear payment method')
    } finally {
      setClearingPaymentMethod(false)
    }
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Admin Checking</h2>
        <p>Request fresh metrics for a specific account, monitor completion status, and review breach reports.</p>
      </div>

      <div className="admin-table-card" style={{ display: 'grid', gap: 16 }}>
        <div className="admin-mobile-controls">
          <input
            type="text"
            placeholder="Enter account number"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
            className="admin-mobile-input"
          />
          <div className="admin-mobile-button-row">
            <button type="button" onClick={handleLookup} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button type="button" onClick={handleReset} disabled={!account || resetting}>
              {resetting ? 'Requesting...' : 'Request Reset'}
            </button>
          </div>
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
                onClick={() => setShowReplaceModal(true)}
                style={{
                  background: '#111827',
                  border: '1px solid #334155',
                  color: '#fda4af',
                }}
              >
                Replace Account
              </button>
              {String(account.platform ?? '').toLowerCase() === 'mt5' && (
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    style={{
                      background: '#111827',
                      border: '1px solid #334155',
                      color: '#93c5fd',
                    }}
                  >
                    Update MT5 Password
                  </button>
              )}
              {account.breach_report_url && (
                <button
                  type="button"
                  onClick={() => window.open(account.breach_report_url ?? '', '_blank', 'noopener,noreferrer')}
                  style={{
                    background: '#111827',
                    border: '1px solid #334155',
                    color: '#86efac',
                  }}
                >
                  Download Report
                </button>
              )}
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
                display: 'grid',
                gap: 12,
              }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 10,
                  }}
                >
                  {[
                    ['Reason', account.breach_reason ?? 'No breach recorded'],
                    ['Breach Time', formatBreachTime(account)],
                    ['Account Peak', formatCurrency(account.highest_balance, account.currency)],
                    ['Equity Low', formatCurrency(account.daily_low_equity ?? account.min_equity, account.currency)],
                    ['Daily High', formatCurrency(account.daily_high_balance, account.currency)],
                    ['Daily Breach Balance', formatCurrency(account.daily_breach_balance, account.currency)],
                    ['Max Breach Balance', formatCurrency(account.breach_balance, account.currency)],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: '#111827', border: '1px solid #334155', borderRadius: 10, padding: 10 }}>
                      <div style={{ color: '#93c5fd', fontSize: 12, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontWeight: 700 }}>{value}</div>
                    </div>
                  ))}
                </div>
                {account.breach_event && (
                  <div>
                    <strong>Trigger Event</strong>
                    {isPlainObject(account.breach_event)
                      ? renderKeyValueBlock(account.breach_event)
                      : <div style={{ marginTop: 6, fontSize: 13 }}>{String(account.breach_event)}</div>}
                  </div>
                )}
                {Array.isArray(account.trade_duration_violations) && account.trade_duration_violations.length > 0 && (
                  <div>
                    <strong>Trade Duration Violations</strong>
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {account.trade_duration_violations.slice(0, 3).map((violation, index) => (
                        <div key={`violation-${index}`} style={{ fontSize: 13, padding: 10, borderRadius: 10, background: '#111827', border: '1px solid #334155', minWidth: 220, flex: '1 1 240px' }}>
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

        <div style={{
          background: '#0b1220',
          border: '1px solid #1f2937',
          borderRadius: 12,
          padding: 16,
          display: 'grid',
          gap: 12,
        }}>
          <div>
            <strong style={{ color: '#f8fafc' }}>User Payment Method</strong>
            <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: 14 }}>Search a user by email and clear their payout method so they can submit new payout details.</p>
          </div>

          <div className="admin-mobile-controls">
            <input
              type="email"
              placeholder="Enter user email"
              value={paymentEmail}
              onChange={(event) => setPaymentEmail(event.target.value)}
              className="admin-mobile-input"
            />
            <div className="admin-mobile-button-row">
              <button type="button" onClick={handlePaymentLookup} disabled={paymentLookupLoading}>
                {paymentLookupLoading ? 'Searching...' : 'Search Email'}
              </button>
              <button type="button" onClick={handleClearPaymentMethod} disabled={!paymentMethodUser?.payout_method_type || clearingPaymentMethod}>
                {clearingPaymentMethod ? 'Deleting...' : 'Delete Payment Method'}
              </button>
            </div>
          </div>

          {paymentMethodUser && (
            <div style={{ color: '#cbd5f5', display: 'grid', gap: 4 }}>
              <span>User: {paymentMethodUser.full_name ?? '—'} ({paymentMethodUser.email})</span>
              <span>Method: {paymentMethodUser.payout_method_type ?? 'None'}</span>
              <span>
                Details: {paymentMethodUser.payout_method_type === 'crypto'
                  ? `${paymentMethodUser.payout_crypto_currency ?? '—'} • ${paymentMethodUser.payout_crypto_address ?? '—'}`
                  : `${paymentMethodUser.payout_bank_name ?? '—'} • ${paymentMethodUser.payout_account_number ?? '—'}`}
              </span>
              <span>Verified At: {formatDateTime(paymentMethodUser.payout_verified_at)}</span>
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && account && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: 'min(460px, 92vw)', background: '#0b1220', border: '1px solid #334155', borderRadius: 14, padding: 20, display: 'grid', gap: 14 }}>
            <h3 style={{ margin: 0, color: '#f8fafc' }}>Update MT5 Password</h3>
            <p style={{ margin: 0, color: '#cbd5e1', fontSize: 14 }}>Set a new MT5 password for account <strong>{account.account_number}</strong>.</p>
            <input
              type="text"
              placeholder="Enter new MT5 password"
              value={newMt5Password}
              onChange={(event) => setNewMt5Password(event.target.value)}
              style={{ border: '1px solid #2a2f3a', background: '#0f172a', color: '#e5e7eb', borderRadius: 10, padding: '10px 12px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowPasswordModal(false)} style={{ background: '#111827', border: '1px solid #334155', color: '#cbd5e1' }}>Cancel</button>
              <button type="button" onClick={handleUpdateMt5Password} disabled={updatingPassword} style={{ background: '#111827', border: '1px solid #334155', color: '#93c5fd' }}>
                {updatingPassword ? 'Updating...' : 'Save Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReplaceModal && account && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: 'min(500px, 92vw)', background: '#0b1220', border: '1px solid #334155', borderRadius: 14, padding: 20, display: 'grid', gap: 14 }}>
            <h3 style={{ margin: 0, color: '#f8fafc' }}>Replace Account</h3>
            <p style={{ margin: 0, color: '#cbd5e1', fontSize: 14 }}>Assign a ready replacement for <strong>{account.account_number}</strong> with the same size/type. You can optionally move the user to the next phase.</p>
            <select
              value={replacementPlatform}
              onChange={(event) => setReplacementPlatform(event.target.value as 'mt5' | 'ctrader')}
              style={{ border: '1px solid #2a2f3a', background: '#0f172a', color: '#e5e7eb', borderRadius: 10, padding: '10px 12px' }}
            >
              <option value="mt5">mt5</option>
              <option value="ctrader">ctrader</option>
            </select>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#cbd5f5', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={replaceToNextPhase}
                onChange={(event) => setReplaceToNextPhase(event.target.checked)}
              />
              Next Phase
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowReplaceModal(false)} style={{ background: '#111827', border: '1px solid #334155', color: '#cbd5e1' }}>Cancel</button>
              <button type="button" onClick={handleReplaceAccount} disabled={replacingAccount} style={{ background: '#111827', border: '1px solid #334155', color: '#fda4af' }}>
                {replacingAccount ? 'Replacing...' : 'Confirm Replace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminCheckingPage