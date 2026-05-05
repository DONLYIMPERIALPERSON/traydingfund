import React, { useState, useEffect } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import '../styles/DesktopAffiliatePage.css'
import {
  fetchAffiliateDashboard,
  requestAffiliatePayout,
} from '../lib/affiliateApi'
import type { AffiliateDashboard } from '../lib/affiliateApi'

const AffiliatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payouts' | 'transactions' | 'request'>('payouts')
  const [dashboardData, setDashboardData] = useState<AffiliateDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestingPayout, setRequestingPayout] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchAffiliateDashboard()
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load affiliate data')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyReferralLink = () => {
    if (dashboardData?.referral_link) {
      navigator.clipboard.writeText(dashboardData.referral_link)
      // You could add a toast notification here
    }
  }

  const handleRequestPayout = async () => {
    if (!dashboardData?.stats.available_balance || dashboardData.stats.available_balance <= 0) {
      alert('No available balance to withdraw')
      return
    }

    try {
      setRequestingPayout(true)
      await requestAffiliatePayout()
      alert('Payout requested successfully!')
      // Reload dashboard data to reflect changes
      await loadDashboardData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to request payout')
    } finally {
      setRequestingPayout(false)
    }
  }

  const formatCurrency = (amount: number) => {
    const currency = dashboardData?.display_currency === 'NGN' ? 'NGN' : 'USD'
    if (currency === 'NGN') {
      return `₦${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }


  if (loading) {
    return (
      <div className="affiliate-page">
        <DesktopHeader />
        <DesktopSidebar />
        <div className="affiliate-content">
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <div>Loading affiliate data...</div>
          </div>
        </div>
        <DesktopFooter />
      </div>
    )
  }

  if (error) {
    return (
      <div className="affiliate-page">
        <DesktopHeader />
        <DesktopSidebar />
        <div className="affiliate-content">
          <ServiceUnavailableState onRetry={loadDashboardData} />
        </div>
        <DesktopFooter />
      </div>
    )
  }

  return (
    <div className="affiliate-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="affiliate-content">
        {/* Back Button */}
        <div className="back-button">
          <button onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left"></i>
            Back to Accounts Overview
          </button>
        </div>

        {/* Page Header */}
        <div className="page-header">
          <h1>Affiliate Program</h1>
          <p>Earn commissions by referring traders to MacheFunded</p>
        </div>

        {/* Referral Link Section */}
        <div className="referral-section">
          <h3>Your Referral Link</h3>
          <div className="referral-input-group">
            <input
              type="text"
              value={dashboardData?.referral_link || 'Loading...'}
              readOnly
              className="referral-input"
            />
            <button
              onClick={handleCopyReferralLink}
              className="copy-button"
            >
              Copy Link
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-card--commission">
            <div className="stat-icon">
              <i className="fas fa-percent"></i>
            </div>
            <div className="stat-value">{dashboardData?.commission_percent ?? 30}%</div>
            <div className="stat-label">Current Referral Commission</div>
          </div>

          {/* Available Balance */}
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-wallet"></i>
            </div>
            <div className="stat-value">{formatCurrency(dashboardData?.stats.available_balance || 0)}</div>
            <div className="stat-label">Available Balance</div>
          </div>

          {/* Total Earned */}
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="stat-value">{formatCurrency(dashboardData?.stats.total_earned || 0)}</div>
            <div className="stat-label">Total Earned</div>
          </div>

          {/* Referrals */}
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-value">{dashboardData?.stats.referrals || 0}</div>
            <div className="stat-label">Referrals</div>
          </div>

          {/* Impressions removed until tracking is implemented */}
        </div>

        {/* Rewards Section removed per request */}

        {/* Tabs Section */}
        <div className="tabs-section">
          <div className="tabs-container">
            <button
              onClick={() => setActiveTab('payouts')}
              className={`tab-button ${activeTab === 'payouts' ? 'active' : ''}`}
            >
              Last 4 Payouts
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
            >
              Last 4 Transactions
            </button>
            <button
              onClick={() => setActiveTab('request')}
              className={`tab-button ${activeTab === 'request' ? 'active' : ''}`}
            >
              Request Payout
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'transactions' && (
            <div>
              <h3 className="tab-content">Last 5 Transactions</h3>

              <div className="transactions-table">
                <div className="table-header">
                  <span>Date</span>
                  <span>Type</span>
                  <span>Commission</span>
                </div>

                {dashboardData?.recent_transactions.length ? (
                  dashboardData.recent_transactions.map((transaction, index) => (
                    <div key={index} className="table-row">
                      <span>{transaction.date}</span>
                      <span>{transaction.type}</span>
                      <span>{formatCurrency(transaction.commission)}</span>
                    </div>
                  ))
                ) : (
                  <div className="table-row">
                    <span style={{ gridColumn: '1 / -1', textAlign: 'center' }}>No transactions yet</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'payouts' && (
            <div>
              <h3 className="tab-content">Last Four Payouts</h3>

              <div className="payouts-table">
                <div className="payouts-header">
                  <span>Date</span>
                  <span>Status</span>
                  <span>Amount</span>
                </div>

                {dashboardData?.recent_payouts.length ? (
                  dashboardData.recent_payouts.map((payout, index) => (
                    <div key={index} className="payouts-row">
                      <span className="date">{payout.date}</span>
                      <span className={`status ${payout.status.toLowerCase()}`}>{payout.status}</span>
                      <span className="amount">{formatCurrency(payout.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="payouts-row">
                    <span style={{ gridColumn: '1 / -1', textAlign: 'center' }}>No payouts yet</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'request' && (
            <div>
              <h3 className="tab-content">Request Affiliate Payout</h3>

                <div className="payout-form">
                  {/* Withdraw Button */}
                  <div className="button-group">
                    <button
                      className="withdraw-button"
                      onClick={handleRequestPayout}
                      disabled={requestingPayout || !dashboardData?.stats.available_balance}
                    >
                      {requestingPayout ? 'Requesting...' : 'Withdraw Now'}
                    </button>
                  </div>

                  {/* Saved Account Info */}
                  <div className="account-info">
                    {dashboardData?.bank_details ? (
                      <div>
                        <strong>Saved Payout Method:</strong> {dashboardData.bank_details.account_name} — {dashboardData.bank_details.bank_name} ({dashboardData.bank_details.account_number})
                      </div>
                    ) : dashboardData?.payout_method_type === 'crypto' ? (
                      <div>
                        <strong>Saved Payout Method:</strong> Crypto wallet configured. See Settings for details.
                      </div>
                    ) : (
                      <div style={{ color: 'red' }}>
                        <strong>No payout method saved.</strong> Please configure your payout details in Settings before requesting payouts.
                      </div>
                    )}
                  </div>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default AffiliatePage
