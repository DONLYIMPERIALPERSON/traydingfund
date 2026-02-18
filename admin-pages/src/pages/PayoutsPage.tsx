import { useState } from 'react'
import './PayoutsPage.css'

type PayoutRequest = {
  id: string
  user: string
  mt5Account: string
  amount: string
  status: 'Under Review' | 'Approved' | 'Auto Paid' | 'Declined'
  ruleStatus: 'Verified'
  mt5Server: string
  mt5Password: string
}

const initialPayoutRequests: PayoutRequest[] = [
    {
      id: '#PO-8821',
      user: 'Chinedu A.',
      mt5Account: '10293847',
      amount: '₦1,250,000',
      status: 'Under Review',
      ruleStatus: 'Verified',
      mt5Server: 'MT5-Live-01',
      mt5Password: 'CHN@2048',
    },
    {
      id: '#PO-8814',
      user: 'Fatima S.',
      mt5Account: '10300661',
      amount: '₦980,000',
      status: 'Approved',
      ruleStatus: 'Verified',
      mt5Server: 'MT5-Live-01',
      mt5Password: 'FTM@7721',
    },
    {
      id: '#PO-8807',
      user: 'David O.',
      mt5Account: '10293855',
      amount: '₦2,400,000',
      status: 'Auto Paid',
      ruleStatus: 'Verified',
      mt5Server: 'MT5-Live-02',
      mt5Password: 'DVD@9482',
    },
  ]

const PayoutsPage = () => {
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>(initialPayoutRequests)
  const [selectedMt5Request, setSelectedMt5Request] = useState<PayoutRequest | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const updateRequestStatus = (requestId: string, nextStatus: 'Approved' | 'Declined') => {
    setPayoutRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? { ...request, status: nextStatus } : request,
      ),
    )
  }

  const handleCopy = async (fieldKey: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(fieldKey)
      setTimeout(() => setCopiedField(null), 1200)
    } catch {
      setCopiedField(null)
    }
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Payout Requests</h2>
        <p>Review eligibility, approve/reject requests, and monitor payout processing queue.</p>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <h3>Pending Review</h3>
          <strong>36</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Approved Today</h3>
          <strong>14</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Paid Today</h3>
          <strong>₦18,900,000</strong>
        </article>
        <article className="admin-kpi-card">
          <h3>Rejected</h3>
          <strong>5</strong>
        </article>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>User</th>
              <th>MT5 Account Number</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Rule Status</th>
              <th>MT5 Details</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payoutRequests.map((request) => (
              <tr key={request.id}>
                <td>{request.id}</td>
                <td>{request.user}</td>
                <td>{request.mt5Account}</td>
                <td>{request.amount}</td>
                <td>{request.status}</td>
                <td>{request.ruleStatus}</td>
                <td>
                  <button
                    type="button"
                    className="payout-action-btn"
                    onClick={() => setSelectedMt5Request(request)}
                  >
                    See MT5 Login Details
                  </button>
                </td>
                <td>
                  {request.status === 'Under Review' ? (
                    <div className="payout-action-group">
                      <button
                        type="button"
                        className="payout-action-btn approve"
                        onClick={() => updateRequestStatus(request.id, 'Approved')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="payout-action-btn decline"
                        onClick={() => updateRequestStatus(request.id, 'Declined')}
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedMt5Request && (
        <div className="payout-modal-backdrop" onClick={() => setSelectedMt5Request(null)}>
          <div className="payout-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="payout-modal-header">
              <h3>MT5 Login Details</h3>
              <button type="button" onClick={() => setSelectedMt5Request(null)}>✕</button>
            </div>

            <div className="payout-modal-grid">
              <article>
                <span>Server</span>
                <div className="payout-modal-row">
                  <strong>{selectedMt5Request.mt5Server}</strong>
                  <button
                    type="button"
                    className={`payout-copy-btn ${copiedField === 'server' ? 'copied' : ''}`}
                    onClick={() => handleCopy('server', selectedMt5Request.mt5Server)}
                  >
                    {copiedField === 'server' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </article>
              <article>
                <span>Account Number</span>
                <div className="payout-modal-row">
                  <strong>{selectedMt5Request.mt5Account}</strong>
                  <button
                    type="button"
                    className={`payout-copy-btn ${copiedField === 'account' ? 'copied' : ''}`}
                    onClick={() => handleCopy('account', selectedMt5Request.mt5Account)}
                  >
                    {copiedField === 'account' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </article>
              <article>
                <span>Password</span>
                <div className="payout-modal-row">
                  <strong>{selectedMt5Request.mt5Password}</strong>
                  <button
                    type="button"
                    className={`payout-copy-btn ${copiedField === 'password' ? 'copied' : ''}`}
                    onClick={() => handleCopy('password', selectedMt5Request.mt5Password)}
                  >
                    {copiedField === 'password' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default PayoutsPage
