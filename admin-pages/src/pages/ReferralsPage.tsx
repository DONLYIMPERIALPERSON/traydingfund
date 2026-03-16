import { useState, useEffect } from 'react'
import {
  fetchAffiliateOverview,
  fetchAffiliateCommissions,
  fetchAffiliatePayouts,
  approveAffiliatePayout,
  rejectAffiliatePayout,
  type AffiliateOverviewStats,
  type AffiliateCommission,
  type AffiliatePayout,
} from '../lib/adminMock'
import './ReferralsPage.css'

interface ReferralsPageProps {}

const ReferralsPage = ({}: ReferralsPageProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'payouts'>('overview')
  const [overview, setOverview] = useState<AffiliateOverviewStats | null>(null)
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([])
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOverview()
  }, [])

  const loadOverview = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchAffiliateOverview()
      setOverview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load affiliate data')
    } finally {
      setLoading(false)
    }
  }

  const loadCommissions = async () => {
    try {
      const data = await fetchAffiliateCommissions()
      setCommissions(data.commissions)
    } catch (err) {
      console.error('Failed to load commissions:', err)
    }
  }

  const loadPayouts = async () => {
    try {
      const data = await fetchAffiliatePayouts()
      setPayouts(data.payouts)
    } catch (err) {
      console.error('Failed to load payouts:', err)
    }
  }


  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    if (tab === 'commissions' && commissions.length === 0) {
      loadCommissions()
    } else if (tab === 'payouts' && payouts.length === 0) {
      loadPayouts()
    }
  }

  const handleApprovePayout = async (payoutId: number) => {
    try {
      await approveAffiliatePayout(payoutId)
      // Reload payouts
      loadPayouts()
      loadOverview()
    } catch (err) {
      alert('Failed to approve payout')
    }
  }

  const handleRejectPayout = async (payoutId: number) => {
    const reason = prompt('Reason for rejection (optional):')
    try {
      await rejectAffiliatePayout(payoutId, reason || undefined)
      // Reload payouts
      loadPayouts()
      loadOverview()
    } catch (err) {
      alert('Failed to reject payout')
    }
  }


  if (loading) {
    return (
      <section className="admin-page-stack referrals-page">
        <div className="admin-dashboard-card">
          <h2>Referrals / Affiliates</h2>
          <p>Loading affiliate data...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="admin-page-stack referrals-page">
        <div className="admin-dashboard-card">
          <h2>Referrals / Affiliates</h2>
          <p className="error">Error: {error}</p>
          <button onClick={loadOverview}>Retry</button>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-page-stack referrals-page">
      <div className="admin-dashboard-card">
        <h2>Referrals / Affiliates</h2>
        <p>Commission performance, payout management, and milestone tracking.</p>
      </div>

      {/* Tab Navigation */}
      <div className="admin-dashboard-card">
        <div className="tab-navigation">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => handleTabChange('overview')}
          >
            Overview
          </button>
          <button
            className={activeTab === 'commissions' ? 'active' : ''}
            onClick={() => handleTabChange('commissions')}
          >
            Commissions
          </button>
          <button
            className={activeTab === 'payouts' ? 'active' : ''}
            onClick={() => handleTabChange('payouts')}
          >
            Payouts
          </button>
        </div>
      </div>

      {activeTab === 'overview' && overview && (
        <>
          <div className="admin-kpi-grid referrals-kpi-grid">
            <article className="admin-kpi-card">
              <h3>Total Affiliates</h3>
              <strong>{overview.total_affiliates.toLocaleString()}</strong>
            </article>
            <article className="admin-kpi-card">
              <h3>Total Commissions</h3>
              <strong>${overview.total_commissions.toLocaleString()}</strong>
            </article>
            <article className="admin-kpi-card">
              <h3>Total Paid Out</h3>
              <strong>${overview.total_paid_out.toLocaleString()}</strong>
            </article>
            <article className="admin-kpi-card">
              <h3>Pending Payouts</h3>
              <strong>{overview.pending_payouts_count} (${overview.pending_payouts_sum.toLocaleString()})</strong>
            </article>
            <article className="admin-kpi-card">
              <h3>Unique Purchasers</h3>
              <strong>{overview.unique_purchasers.toLocaleString()}</strong>
            </article>
          </div>

          <div className="admin-dashboard-card">
            <h3>Admin Actions Required</h3>
            <ul className="admin-list">
              <li><strong>Pending Payouts:</strong> {overview.pending_payouts_count} payouts awaiting approval</li>
              <li>Review payout requests for bank details and eligibility</li>
              <li>Monitor commission trends and affiliate performance</li>
            </ul>
          </div>
        </>
      )}

      {activeTab === 'commissions' && (
        <div className="admin-dashboard-card">
          <h3>Recent Commissions</h3>
          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Affiliate</th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Product</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((commission) => (
                  <tr key={commission.id}>
                    <td>{commission.date}</td>
                    <td>{commission.affiliate}</td>
                    <td>{commission.order_id}</td>
                    <td>{commission.customer}</td>
                    <td>${commission.amount.toLocaleString()}</td>
                    <td>
                      <span className={`status-chip ${commission.status.toLowerCase()}`}>
                        {commission.status}
                      </span>
                    </td>
                    <td>{commission.product_summary || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="admin-dashboard-card">
          <h3>Payout Requests</h3>
          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Affiliate</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Bank Details</th>
                  <th>Requested</th>
                  <th>Approved</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td>{payout.affiliate}</td>
                    <td>${payout.amount.toLocaleString()}</td>
                    <td>
                      <span className={`status-chip ${payout.status.toLowerCase()}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td>{payout.bank_details}</td>
                    <td>{payout.requested_at}</td>
                    <td>{payout.approved_at || 'N/A'}</td>
                    <td>
                      {payout.status === 'pending' && (
                        <div className="action-buttons">
                          <button
                            className="approve-btn"
                            onClick={() => handleApprovePayout(payout.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleRejectPayout(payout.id)}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </section>
  )
}

export default ReferralsPage
