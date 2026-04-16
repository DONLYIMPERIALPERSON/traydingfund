import { useEffect, useMemo, useState } from 'react'
import { fetchAccountRecoveryRequests, reviewAccountRecoveryRequest, type AccountRecoveryRequestItem } from '../lib/adminApi'

const AccountRecoveryPage = () => {
  const [requests, setRequests] = useState<AccountRecoveryRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending')
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const [platforms, setPlatforms] = useState<Record<number, 'ctrader' | 'mt5'>>({})
  const [brokers, setBrokers] = useState<Record<number, string>>({})
  const [mt5Servers, setMt5Servers] = useState<Record<number, 'Exness-MT5Trial9' | 'Exness-MT5Trial10'>>({})
  const [mt5Passwords, setMt5Passwords] = useState<Record<number, string>>({})
  const [actioningId, setActioningId] = useState<number | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetchAccountRecoveryRequests()
      setRequests(response.requests)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account recovery requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => statusFilter === 'all' ? requests : requests.filter((item) => item.status === statusFilter), [requests, statusFilter])

  const handleReview = async (requestId: number, action: 'approve' | 'decline') => {
    try {
      setActioningId(requestId)
      setError('')
      await reviewAccountRecoveryRequest(requestId, {
        action,
        review_note: notes[requestId] || undefined,
        decline_reason: action === 'decline' ? (reasons[requestId] || 'Declined by admin') : undefined,
        platform: action === 'approve' ? (platforms[requestId] || 'ctrader') : undefined,
        broker_name: action === 'approve' ? (brokers[requestId] || undefined) : undefined,
        mt5_server: action === 'approve' ? (mt5Servers[requestId] || 'Exness-MT5Trial9') : undefined,
        mt5_password: action === 'approve' ? (mt5Passwords[requestId] || undefined) : undefined,
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review request')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-table-card">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Account Recovery Requests</h3>
            <p style={{ margin: 0, color: '#6b7280' }}>Approve and restore lost trader accounts or decline invalid requests.</p>
          </div>
          <select className="period-selector-large" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
            <option value="all">All</option>
          </select>
        </div>
        {loading && <p style={{ color: '#9ca3af', padding: '10px 16px', margin: 0 }}>Loading recovery requests...</p>}
        {!loading && error && <p style={{ color: '#fca5a5', padding: '10px 16px', margin: 0 }}>{error}</p>}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Trader</th>
              <th>Account Details</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af' }}>No recovery requests found.</td></tr>
            ) : filtered.map((request) => (
              <tr key={request.id}>
                <td>
                  <div className="user-info">
                    <div className="user-name">{request.user_name || request.user_email || request.email}</div>
                    <div className="user-email">{request.user_email || request.email}</div>
                  </div>
                </td>
                <td>
                  <div><strong>{request.account_number}</strong></div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{request.platform?.toUpperCase()} • {request.account_type} • {request.account_size} • {request.phase}</div>
                  {(request.platform || request.broker_name || request.mt5_login || request.mt5_server) && (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {request.broker_name ? `Broker: ${request.broker_name}` : ''}
                      {request.mt5_login ? `${request.platform || request.broker_name ? ' • ' : ''}Login: ${request.mt5_login}` : ''}
                      {request.mt5_server ? `${request.platform || request.broker_name || request.mt5_login ? ' • ' : ''}Server: ${request.mt5_server}` : ''}
                    </div>
                  )}
                  {request.recovered_account_id && <div style={{ fontSize: 12, color: '#065f46' }}>Recovered account ID: {request.recovered_account_id}</div>}
                </td>
                <td>{new Date(request.submitted_at).toLocaleString()}</td>
                <td>
                  <span className={`kyc-status-pill kyc-status-${request.status}`}>{request.status}</span>
                  {request.decline_reason && <div style={{ fontSize: 12, color: '#ef4444' }}>{request.decline_reason}</div>}
                </td>
                <td>
                  {request.status === 'pending' ? (
                    <div className="kyc-review-actions">
                      <select
                        className="kyc-review-input"
                        value={platforms[request.id] ?? ((request.platform?.toLowerCase() === 'mt5' ? 'mt5' : 'ctrader'))}
                        onChange={(e) => setPlatforms((prev) => ({ ...prev, [request.id]: e.target.value as 'ctrader' | 'mt5' }))}
                      >
                        <option value="ctrader">cTrader</option>
                        <option value="mt5">MT5</option>
                      </select>
                      <input
                        className="kyc-review-input"
                        placeholder="Broker / server name"
                        value={brokers[request.id] ?? ''}
                        onChange={(e) => setBrokers((prev) => ({ ...prev, [request.id]: e.target.value }))}
                      />
                      {(platforms[request.id] ?? 'ctrader') === 'mt5' && (
                        <>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            MT5 login will use the submitted account number: <strong>{request.account_number}</strong>
                          </div>
                          <select
                            className="kyc-review-input"
                            value={mt5Servers[request.id] ?? 'Exness-MT5Trial9'}
                            onChange={(e) => setMt5Servers((prev) => ({ ...prev, [request.id]: e.target.value as 'Exness-MT5Trial9' | 'Exness-MT5Trial10' }))}
                          >
                            <option value="Exness-MT5Trial9">Exness-MT5Trial9</option>
                            <option value="Exness-MT5Trial10">Exness-MT5Trial10</option>
                          </select>
                          <input
                            className="kyc-review-input"
                            placeholder="MT5 password"
                            value={mt5Passwords[request.id] ?? ''}
                            onChange={(e) => setMt5Passwords((prev) => ({ ...prev, [request.id]: e.target.value }))}
                          />
                        </>
                      )}
                      <input
                        className="kyc-review-input"
                        placeholder="Review note (optional)"
                        value={notes[request.id] ?? ''}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [request.id]: e.target.value }))}
                      />
                      <input
                        className="kyc-review-input"
                        placeholder="Decline reason"
                        value={reasons[request.id] ?? ''}
                        onChange={(e) => setReasons((prev) => ({ ...prev, [request.id]: e.target.value }))}
                      />
                      <div className="kyc-review-buttons">
                        <button type="button" className="kyc-approve-btn" onClick={() => void handleReview(request.id, 'approve')} disabled={actioningId === request.id}>
                          {actioningId === request.id ? 'Approving...' : 'Approve'}
                        </button>
                        <button type="button" className="kyc-decline-btn" onClick={() => void handleReview(request.id, 'decline')} disabled={actioningId === request.id}>
                          {actioningId === request.id ? 'Declining...' : 'Decline'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: '#6b7280' }}>Reviewed{request.reviewed_by ? ` by ${request.reviewed_by}` : ''}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default AccountRecoveryPage