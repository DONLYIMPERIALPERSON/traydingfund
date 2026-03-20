import { useEffect, useMemo, useState } from 'react'
import {
  fetchAdminKycRequests,
  reviewKycRequest,
  type AdminKycRequestItem,
} from '../lib/adminMock'
import './KycReviewPage.css'
import type { AdminUser } from './UsersPage'

interface KycReviewPageProps {
  onOpenProfile: (user: AdminUser) => void
}

const KycReviewPage = ({ onOpenProfile }: KycReviewPageProps) => {
  const [requests, setRequests] = useState<AdminKycRequestItem[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending')
  const [actioningRequestId, setActioningRequestId] = useState<number | null>(null)
  const [declineReason, setDeclineReason] = useState<Record<number, string>>({})

  useEffect(() => {
    const loadRequests = async (page: number = 1) => {
      setRequestsLoading(true)
      setRequestsError('')
      try {
        const response = await fetchAdminKycRequests(page, 20)
        setRequests(response.requests)
        setCurrentPage(response.pagination.page)
        setTotalPages(response.pagination.pages)
      } catch (err) {
        setRequestsError(err instanceof Error ? err.message : 'Failed to load KYC requests')
      } finally {
        setRequestsLoading(false)
      }
    }

    void loadRequests(currentPage)
  }, [currentPage])

  const filteredRequests = useMemo(() => {
    if (selectedStatus === 'all') return requests
    return requests.filter((request) => request.status === selectedStatus)
  }, [requests, selectedStatus])

  const handleReview = async (requestId: number, action: 'approve' | 'decline') => {
    setActioningRequestId(requestId)
    setRequestsError('')
    try {
      await reviewKycRequest(requestId, {
        action,
        decline_reason: action === 'decline' ? declineReason[requestId] || 'Declined by admin' : undefined,
      })
      const response = await fetchAdminKycRequests(currentPage, 20)
      setRequests(response.requests)
      setCurrentPage(response.pagination.page)
      setTotalPages(response.pagination.pages)
    } catch (err) {
      setRequestsError(err instanceof Error ? err.message : 'Failed to review request')
    } finally {
      setActioningRequestId(null)
    }
  }

  return (
    <section className="admin-page-stack kyc-review-page">
      <div className="admin-table-card">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>KYC Requests</h3>
            <p style={{ margin: 0, color: '#6b7280' }}>Review submitted documents, payout details, and approve/decline.</p>
          </div>
          <select
            className="period-selector-large"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as typeof selectedStatus)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
            <option value="all">All</option>
          </select>
        </div>
        {requestsLoading && <p style={{ color: '#9ca3af', padding: '10px 16px', margin: 0 }}>Loading KYC requests...</p>}
        {!requestsLoading && requestsError && (
          <p style={{ color: '#fca5a5', padding: '10px 16px', margin: 0 }}>{requestsError}</p>
        )}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Trader</th>
              <th>Document</th>
              <th>Payout Details</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af' }}>No KYC requests found.</td>
              </tr>
            ) : (
              filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-name">{request.user.name}</div>
                      <div className="user-email">{request.user.email}</div>
                    </div>
                  </td>
                  <td>
                    <div>{request.document_type.replace('_', ' ')}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{request.document_number}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      <a href={request.id_front_url} target="_blank" rel="noreferrer">Front</a>
                      {request.id_back_url && (
                        <>
                          {' • '}
                          <a href={request.id_back_url} target="_blank" rel="noreferrer">Back</a>
                        </>
                      )}
                      {request.selfie_url && (
                        <>
                          {' • '}
                          <a href={request.selfie_url} target="_blank" rel="noreferrer">Selfie</a>
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    {request.user.payout_method_type === 'crypto' ? (
                      <div>
                        <div>
                          {(request.user.payout_crypto_first_name || request.user.payout_crypto_last_name)
                            ? `${request.user.payout_crypto_first_name ?? ''} ${request.user.payout_crypto_last_name ?? ''}`.trim()
                            : 'Crypto Payout'}
                        </div>
                        <div>{request.user.payout_crypto_currency ?? 'Crypto'}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{request.user.payout_crypto_address ?? '-'}</div>
                      </div>
                    ) : (
                      <div>
                        <div>{request.user.payout_account_name ?? '-'}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {request.user.payout_bank_name ?? request.user.payout_bank_code ?? ''} {request.user.payout_account_number ?? ''}
                        </div>
                      </div>
                    )}
                  </td>
                  <td>{new Date(request.submitted_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`kyc-status-pill kyc-status-${request.status}`}>
                      {request.status}
                    </span>
                    {request.decline_reason && (
                      <div style={{ fontSize: 12, color: '#ef4444' }}>{request.decline_reason}</div>
                    )}
                  </td>
                  <td>
                    {request.status === 'pending' ? (
                      <div className="kyc-review-actions">
                        <input
                          className="kyc-review-input"
                          placeholder="Decline reason (optional)"
                          value={declineReason[request.id] ?? ''}
                          onChange={(event) =>
                            setDeclineReason((prev) => ({ ...prev, [request.id]: event.target.value }))
                          }
                        />
                        <div className="kyc-review-buttons">
                          <button
                            type="button"
                            className="kyc-approve-btn"
                            onClick={() => void handleReview(request.id, 'approve')}
                            disabled={actioningRequestId === request.id}
                          >
                            {actioningRequestId === request.id ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            className="kyc-decline-btn"
                            onClick={() => void handleReview(request.id, 'decline')}
                            disabled={actioningRequestId === request.id}
                          >
                            {actioningRequestId === request.id ? 'Declining...' : 'Decline'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#6b7280' }}>Reviewed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="pagination">
            <button type="button" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage <= 1}>
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default KycReviewPage
