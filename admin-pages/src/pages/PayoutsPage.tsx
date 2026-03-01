import { useState, useEffect } from 'react'
import {
  generatePayoutCertificates,
  fetchPayoutStats,
  fetchPayoutRequests,
  approvePayout,
  rejectPayout,
  type PayoutStats,
  type PayoutRequest
} from '../lib/adminAuth'
import './PayoutsPage.css'

interface AdminUser {
  user_id?: number
  name: string
  email: string
  accounts: string
  revenue: string
  orders: string
  payouts: string
}

const PayoutsPage = ({ onOpenProfile }: { onOpenProfile?: (user: AdminUser) => void }) => {
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([])
  const [stats, setStats] = useState<PayoutStats | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingCertificates, setGeneratingCertificates] = useState(false)

  const fetchPayoutData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch stats and payout requests in parallel
      const [statsData, requestsData] = await Promise.all([
        fetchPayoutStats(selectedPeriod),
        fetchPayoutRequests(1, 50, selectedPeriod)
      ])

      setStats(statsData)
      setPayoutRequests(requestsData.payouts)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payout data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayoutData()
  }, [selectedPeriod])

  const handlePeriodChange = (period: 'today' | 'week' | 'month') => {
    setSelectedPeriod(period)
  }

  const requestRows = payoutRequests.filter((request) => request.status === 'pending_approval')
  const historyRows = payoutRequests.filter((request) => request.status !== 'pending_approval')

  const resolveApprovalInfo = (request: PayoutRequest) => {
    const metadata = request.metadata || {}
    const requiresAdmin = metadata.requires_admin_approval === true
    const approvalType = requiresAdmin ? 'Manual' : 'Auto'
    const approvedBy = metadata.approved_by || (requiresAdmin ? null : 'System')
    const approvedAt = metadata.approved_at || null
    const rejectedBy = metadata.rejected_by || null
    const rejectedAt = metadata.rejected_at || null
    const rejectionReason = metadata.rejection_reason || null

    let decision = 'Pending'
    if (rejectedBy) {
      decision = `Rejected by ${rejectedBy}${rejectionReason ? ` (${rejectionReason})` : ''}`
    } else if (approvedBy) {
      decision = `Approved by ${approvedBy}`
    } else if (!requiresAdmin) {
      decision = 'Auto approved'
    }

    return {
      approvalType,
      approvedBy,
      approvedAt,
      rejectedAt,
      decision,
    }
  }

  const handleApprovePayout = async (payoutId: number) => {
    try {
      await approvePayout(payoutId)
      // Refresh data
      fetchPayoutData()
      alert('Payout approved successfully!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve payout')
    }
  }

  const handleRejectPayout = async (payoutId: number) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return

    try {
      await rejectPayout(payoutId, reason)
      // Refresh data
      fetchPayoutData()
      alert('Payout rejected successfully!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject payout')
    }
  }

  const handleViewUserProfile = (userId: number) => {
    if (onOpenProfile) {
      // Find the user data from the current payout request
      const payoutRequest = payoutRequests.find(p => p.user.id === userId)
      if (payoutRequest) {
        onOpenProfile({
          user_id: payoutRequest.user.id,
          name: payoutRequest.user.name,
          email: payoutRequest.user.email,
          accounts: 'N/A', // We don't have this data in payout requests
          revenue: 'N/A', // We don't have this data in payout requests
          orders: 'N/A', // We don't have this data in payout requests
          payouts: payoutRequest.amount_formatted // Use the payout amount as reference
        })
      }
    }
  }

  const handleGeneratePayoutCertificates = async () => {
    setGeneratingCertificates(true)
    setError('')
    try {
      const result = await generatePayoutCertificates()
      alert(`Payout certificate generation completed!\nGenerated: ${result.generated}\nFailed: ${result.failed}\n\n${result.message}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate payout certificates')
    } finally {
      setGeneratingCertificates(false)
    }
  }

  if (loading) {
    return (
      <section className="admin-page-stack">
        <div className="admin-dashboard-card">
          <h2>Payout Requests</h2>
          <p>Loading payout data...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="admin-page-stack">
        <div className="admin-dashboard-card">
          <h2>Payout Requests</h2>
          <p>Error: {error}</p>
          <button onClick={fetchPayoutData}>Retry</button>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2>Payout Requests</h2>
            <p>Review eligibility, approve/reject requests, and monitor payout processing queue.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleGeneratePayoutCertificates}
              disabled={generatingCertificates}
              style={{
                border: '1px solid #f59e0b',
                background: '#f59e0b',
                color: '#111827',
                borderRadius: 10,
                padding: '10px 14px',
                fontWeight: 700,
                cursor: generatingCertificates ? 'not-allowed' : 'pointer',
                opacity: generatingCertificates ? 0.7 : 1,
              }}
            >
              {generatingCertificates ? 'Generating...' : 'Generate Payout Certificates'}
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'requests' ? '#FFD700' : '#333',
              color: activeTab === 'requests' ? '#000' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Requests ({requestRows.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'history' ? '#FFD700' : '#333',
              color: activeTab === 'history' ? '#000' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            History ({historyRows.length})
          </button>
        </div>

        {/* Time Period Filter */}
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handlePeriodChange('today')}
            style={{
              padding: '8px 16px',
              background: selectedPeriod === 'today' ? '#FFD700' : '#333',
              color: selectedPeriod === 'today' ? '#000' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Today
          </button>
          <button
            onClick={() => handlePeriodChange('week')}
            style={{
              padding: '8px 16px',
              background: selectedPeriod === 'week' ? '#FFD700' : '#333',
              color: selectedPeriod === 'week' ? '#000' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            This Week
          </button>
          <button
            onClick={() => handlePeriodChange('month')}
            style={{
              padding: '8px 16px',
              background: selectedPeriod === 'month' ? '#FFD700' : '#333',
              color: selectedPeriod === 'month' ? '#000' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            This Month
          </button>
        </div>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Pending Review</h3>
          <strong>{stats?.pending_review || 0}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Approved {selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This Week' : 'This Month'}</h3>
          <strong>{stats?.approved_today || 0}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Paid {selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This Week' : 'This Month'}</h3>
          <strong>{stats?.paid_today_formatted || '₦0'}</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Rejected</h3>
          <strong>{stats?.rejected || 0}</strong>
        </article>
      </div>

      <div className="admin-table-card">
        {activeTab === 'requests' && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>User</th>
                <th>Account</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requestRows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '16px' }}>
                    No pending payout requests for this period.
                  </td>
                </tr>
              )}
              {requestRows.map((request) => (
                <tr key={request.id}>
                  <td>{request.provider_order_id}</td>
                  <td>
                    <div>
                      <div>{request.user.name}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{request.user.email}</div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div>{request.account.account_size}</div>
                      {request.metadata?.mt5_account_number ? (
                        <div style={{ fontSize: '12px', color: '#888' }}>MT5: {request.metadata.mt5_account_number}</div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#888' }}>MT5: -</div>
                      )}
                    </div>
                  </td>
                  <td>{request.amount_formatted}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: '#FFA500',
                      color: 'white'
                    }}>
                      PENDING APPROVAL
                    </span>
                  </td>
                  <td>
                    <div>{new Date(request.created_at).toLocaleDateString()}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{new Date(request.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                      <button
                        type="button"
                        className="payout-action-btn"
                        onClick={() => handleViewUserProfile(request.user.id)}
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                      >
                        View Profile
                      </button>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="payout-action-btn approve"
                          onClick={() => handleApprovePayout(request.id)}
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="payout-action-btn decline"
                          onClick={() => handleRejectPayout(request.id)}
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'history' && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>User</th>
                <th>Amount</th>
                <th>Approval</th>
                <th>Decision</th>
                <th>Status</th>
                <th>Created</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '16px' }}>
                    No payout history for this period.
                  </td>
                </tr>
              )}
              {historyRows.map((request) => {
                const approvalInfo = resolveApprovalInfo(request)
                return (
                  <tr key={request.id}>
                    <td>{request.provider_order_id}</td>
                    <td>
                      <div>
                        <div>{request.user.name}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>{request.user.email}</div>
                      </div>
                    </td>
                    <td>
                      <div>{request.amount_formatted}</div>
                      {request.metadata?.mt5_account_number && (
                        <div style={{ fontSize: '12px', color: '#888' }}>MT5: {request.metadata.mt5_account_number}</div>
                      )}
                    </td>
                    <td>{approvalInfo.approvalType}</td>
                    <td>
                      <div>{approvalInfo.decision}</div>
                      {approvalInfo.approvedAt && (
                        <div style={{ fontSize: '12px', color: '#888' }}>
                          Approved: {new Date(approvalInfo.approvedAt).toLocaleString()}
                        </div>
                      )}
                      {approvalInfo.rejectedAt && (
                        <div style={{ fontSize: '12px', color: '#888' }}>
                          Rejected: {new Date(approvalInfo.rejectedAt).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor:
                          request.status === 'processing' ? '#007BFF' :
                          request.status === 'completed' ? '#28A745' :
                          request.status === 'failed' ? '#DC3545' : '#6C757D',
                        color: 'white'
                      }}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {request.created_at ? (
                        <div>
                          <div>{new Date(request.created_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>{new Date(request.created_at).toLocaleTimeString()}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {request.completed_at ? (
                        <div>
                          <div>{new Date(request.completed_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>{new Date(request.completed_at).toLocaleTimeString()}</div>
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default PayoutsPage
