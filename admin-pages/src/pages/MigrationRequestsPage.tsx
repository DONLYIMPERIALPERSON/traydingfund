import { useMemo, useState, useEffect } from 'react'
import { fetchMigrationRequests, updateMigrationRequestStatus, type MigrationRequest } from '../lib/adminAuth'
import './MigrationRequestsPage.css'

interface PayoutModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (amount: number) => void
  request: MigrationRequest | null
  loading: boolean
}

const PayoutModal: React.FC<PayoutModalProps> = ({ isOpen, onClose, onConfirm, request, loading }) => {
  const [amount, setAmount] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (numAmount > 0) {
      onConfirm(numAmount)
    }
  }

  if (!isOpen || !request) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Enter Payout Amount</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="payout-info">
            <p><strong>User:</strong> {request.user_name || request.user_email}</p>
            <p><strong>Request Type:</strong> {request.request_type === 'funded' ? 'Funded Account' : 'Phase 2'}</p>
            <p><strong>Account Size:</strong> {request.account_size}</p>
            {request.request_type === 'funded' && (
              <p><strong>Bank:</strong> {request.bank_name} - {request.account_name}</p>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="payout-amount">Payout Amount (₦)</label>
              <input
                id="payout-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter payout amount"
                required
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading || !amount || parseFloat(amount) <= 0}>
                {loading ? 'Processing...' : 'Confirm Payout'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const MigrationRequestsPage = () => {
  const [requests, setRequests] = useState<MigrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [payoutModal, setPayoutModal] = useState<{ isOpen: boolean; request: MigrationRequest | null }>({
    isOpen: false,
    request: null
  })

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchMigrationRequests()
      setRequests(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load migration requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveClick = (request: MigrationRequest) => {
    if (request.request_type === 'funded') {
      // Show payout modal for funded migrations
      setPayoutModal({ isOpen: true, request })
    } else {
      // Directly approve Phase 2 migrations
      handleStatusUpdate(request.id, 'approved')
    }
  }

  const handlePayoutConfirm = async (amount: number) => {
    if (!payoutModal.request) return

    setProcessingId(payoutModal.request.id)
    setPayoutModal({ isOpen: false, request: null })

    try {
      await updateMigrationRequestStatus(payoutModal.request.id, 'approved', undefined, amount)
      await loadRequests() // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve migration request')
    } finally {
      setProcessingId(null)
    }
  }

  const handleStatusUpdate = async (requestId: number, newStatus: 'approved' | 'declined', notes?: string, withdrawalAmount?: number) => {
    setProcessingId(requestId)
    try {
      await updateMigrationRequestStatus(requestId, newStatus, notes, withdrawalAmount)
      await loadRequests() // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request status')
    } finally {
      setProcessingId(null)
    }
  }

  const filteredRequests = useMemo(() => {
    if (filter === 'all') return requests
    return requests.filter(req => req.status === filter)
  }, [requests, filter])

  const stats = useMemo(() => {
    const total = requests.length
    const pending = requests.filter(r => r.status === 'pending').length
    const approved = requests.filter(r => r.status === 'approved').length
    const declined = requests.filter(r => r.status === 'declined').length
    return { total, pending, approved, declined }
  }, [requests])

  return (
    <section className="admin-page-stack migration-requests-page">
      <div className="admin-dashboard-card migration-header-card">
        <div>
          <h2>Migration Requests</h2>
          <p>Manage account migration requests from external brokers</p>
        </div>
        <div className="migration-quick-stats">
          <article>
            <span>Total Requests</span>
            <strong>{stats.total}</strong>
          </article>
          <article>
            <span>Pending</span>
            <strong>{stats.pending}</strong>
          </article>
          <article>
            <span>Approved</span>
            <strong>{stats.approved}</strong>
          </article>
          <article>
            <span>Declined</span>
            <strong>{stats.declined}</strong>
          </article>
        </div>
      </div>

      <div className="admin-dashboard-card migration-filters-card">
        <h3>Filters</h3>
        <div className="migration-filters">
          <label>
            Status
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Requests</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
            </select>
          </label>
        </div>
      </div>

      <div className="admin-table-card">
        {loading && <p style={{ color: '#9ca3af', padding: '10px 16px', margin: 0 }}>Loading migration requests...</p>}
        {!loading && error && <p style={{ color: '#fca5a5', padding: '10px 16px', margin: 0 }}>{error}</p>}
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Request Type</th>
              <th>Account Size</th>
              <th>MT5 Details</th>
              <th>Bank Details</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af' }}>
                  {loading ? 'Loading...' : 'No migration requests found.'}
                </td>
              </tr>
            ) : (
              filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: '600', color: 'white' }}>{request.user_name || 'Unknown'}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{request.user_email}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`migration-type-badge ${request.request_type}`}>
                      {request.request_type === 'phase2' ? 'Phase 2' : 'Funded'}
                    </span>
                  </td>
                  <td>{request.account_size}</td>
                  <td>
                    <div style={{ fontSize: '12px' }}>
                      <div>Server: {request.mt5_server}</div>
                      <div>Account: {request.mt5_account_number}</div>
                      <div>Password: {request.mt5_password}</div>
                    </div>
                  </td>
                  <td>
                    {request.request_type === 'funded' && request.bank_name ? (
                      <div style={{ fontSize: '12px' }}>
                        <div>Account Name: {request.account_name}</div>
                        <div>Bank: {request.bank_name}</div>
                        <div>Account Number: {request.bank_account_number}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>N/A</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge status-${request.status}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </td>
                  <td>{new Date(request.created_at).toLocaleDateString()}</td>
                  <td>
                    {request.status === 'pending' && (
                      <div className="migration-actions">
                        <button
                          className="migration-action-btn approve"
                          onClick={() => handleApproveClick(request)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          className="migration-action-btn decline"
                          onClick={() => handleStatusUpdate(request.id, 'declined')}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? 'Processing...' : 'Decline'}
                        </button>
                      </div>
                    )}
                    {request.status !== 'pending' && (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                        {request.status === 'approved' ? 'Approved' : 'Declined'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PayoutModal
        isOpen={payoutModal.isOpen}
        onClose={() => setPayoutModal({ isOpen: false, request: null })}
        onConfirm={handlePayoutConfirm}
        request={payoutModal.request}
        loading={!!processingId}
      />
    </section>
  )
}

export default MigrationRequestsPage
