import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileAffiliatePage.css'
import {
  fetchAffiliateDashboard,
  requestAffiliatePayout,
  claimMilestoneReward
} from '../lib/affiliate'
import type { AffiliateDashboard, AffiliateReward } from '../lib/affiliate'

const MobileAffiliatePage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'payouts' | 'transactions' | 'request'>('payouts')
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('')
  const [dashboardData, setDashboardData] = useState<AffiliateDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claimingReward, setClaimingReward] = useState<number | null>(null)
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

  const handleBack = () => {
    navigate(-1)
  }

  const handleCopyReferralLink = () => {
    if (dashboardData?.referral_link) {
      navigator.clipboard.writeText(dashboardData.referral_link)
      // You could add a toast notification here
    }
  }

  const handleClaimReward = async (levelIndex: number) => {
    try {
      setClaimingReward(levelIndex)
      await claimMilestoneReward(levelIndex)
      // Reload dashboard data to reflect changes
      await loadDashboardData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to claim reward')
    } finally {
      setClaimingReward(null)
    }
  }

  const handleRequestPayout = async () => {
    if (!dashboardData?.stats.available_balance || dashboardData.stats.available_balance <= 0) {
      alert('No available balance to withdraw')
      return
    }

    try {
      setRequestingPayout(true)
      await requestAffiliatePayout(dashboardData.stats.available_balance)
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
    return `N${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
  }

  const getRewardStatusText = (reward: AffiliateReward) => {
    switch (reward.status) {
      case 'live':
        return `Progress: ${reward.progress || 0} / ${reward.target || 0} • ${reward.remaining || 0} left`
      case 'locked':
        return 'Status: Locked'
      case 'claimed':
        return 'Status: Claimed'
      default:
        return ''
    }
  }

  const getRewardStatusClass = (status: string) => {
    switch (status) {
      case 'live':
        return 'live'
      case 'locked':
        return 'locked'
      case 'claimed':
        return 'claimed'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="mobile-affiliate-page">
        <div className="mobile-affiliate-fixed-header">
          <div className="mobile-affiliate-header-shell">
            <div className="mobile-affiliate-header-row">
              <div className="mobile-affiliate-header-left">
                <div className="mobile-affiliate-back-button" onClick={handleBack}>
                  <i className="fas fa-chevron-left"></i>
                </div>
              </div>
              <div className="mobile-affiliate-header-center">
                <span className="mobile-affiliate-header-title">Affiliate</span>
              </div>
              <div className="mobile-affiliate-header-right" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="mobile-affiliate-content-container">
          <div style={{ textAlign: 'center', padding: '50px' }}>
            Loading affiliate data...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mobile-affiliate-page">
        <div className="mobile-affiliate-fixed-header">
          <div className="mobile-affiliate-header-shell">
            <div className="mobile-affiliate-header-row">
              <div className="mobile-affiliate-header-left">
                <div className="mobile-affiliate-back-button" onClick={handleBack}>
                  <i className="fas fa-chevron-left"></i>
                </div>
              </div>
              <div className="mobile-affiliate-header-center">
                <span className="mobile-affiliate-header-title">Affiliate</span>
              </div>
              <div className="mobile-affiliate-header-right" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="mobile-affiliate-content-container">
          <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
            <div>Error: {error}</div>
            <button onClick={loadDashboardData} style={{ marginTop: '20px' }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-affiliate-page">
      <div className="mobile-affiliate-fixed-header">
        <div className="mobile-affiliate-header-shell">
          <div className="mobile-affiliate-header-row">
            <div className="mobile-affiliate-header-left">
              <div className="mobile-affiliate-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-affiliate-header-center">
              <span className="mobile-affiliate-header-title">Affiliate</span>
            </div>
            <div className="mobile-affiliate-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-affiliate-content-container">
        <div className="mobile-affiliate-content-padding">
          {/* Referral Link */}
          <div className="mobile-affiliate-referral-section">
            <h3 className="mobile-affiliate-referral-title">Referral Link</h3>
            <div className="mobile-affiliate-referral-input-group">
              <input
                type="text"
                value={dashboardData?.referral_link || 'Loading...'}
                readOnly
                className="mobile-affiliate-referral-input"
              />
              <button
                onClick={handleCopyReferralLink}
                className="mobile-affiliate-copy-button"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mobile-affiliate-stats-section">
            <div className="mobile-affiliate-section-card">
              <h3 className="mobile-affiliate-stats-title">Stats</h3>
              <div className="mobile-affiliate-stats-grid">
                <div className="mobile-affiliate-stat-item">
                  <div className="mobile-affiliate-stat-value">{formatCurrency(dashboardData?.stats.available_balance || 0)}</div>
                  <div className="mobile-affiliate-stat-label">Available Balance</div>
                </div>
                <div className="mobile-affiliate-stat-divider"></div>
                <div className="mobile-affiliate-stat-item">
                  <div className="mobile-affiliate-stat-value">{formatCurrency(dashboardData?.stats.total_earned || 0)}</div>
                  <div className="mobile-affiliate-stat-label">Total Earned</div>
                </div>
                <div className="mobile-affiliate-stat-divider"></div>
                <div className="mobile-affiliate-stat-item">
                  <div className="mobile-affiliate-stat-value">{dashboardData?.stats.referrals || 0}</div>
                  <div className="mobile-affiliate-stat-label">Referral</div>
                </div>
                <div className="mobile-affiliate-stat-divider"></div>
                <div className="mobile-affiliate-stat-item">
                  <div className="mobile-affiliate-stat-value">{dashboardData?.stats.impressions || 0}</div>
                  <div className="mobile-affiliate-stat-label">Impression</div>
                </div>
              </div>
            </div>
          </div>

          {/* Rewards */}
          <div className="mobile-affiliate-rewards-section">
            <div className="mobile-affiliate-section-card">
              <h3 className="mobile-affiliate-rewards-title">Rewards</h3>

              <div className="mobile-affiliate-free-accounts-title">Free Accounts</div>

              <div className="mobile-affiliate-rewards-list">
                {dashboardData?.rewards.map((reward, index) => (
                  <div key={index} className="mobile-affiliate-reward-card">
                    <div className="mobile-affiliate-reward-info">
                      <div className="mobile-affiliate-reward-name">Reward: {formatCurrency(reward.amount)}</div>
                      <div className={`mobile-affiliate-reward-status ${getRewardStatusClass(reward.status)}`}>
                        {getRewardStatusText(reward)}
                        {reward.status === 'locked' && <i className="fas fa-lock"></i>}
                      </div>
                    </div>
                    <button
                      className="mobile-affiliate-claim-button"
                      disabled={reward.status !== 'live' || claimingReward === index}
                      onClick={() => handleClaimReward(index)}
                    >
                      {claimingReward === index ? 'Claiming...' : 'Claim'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mobile-affiliate-tabs">
            <button
              onClick={() => setActiveTab('payouts')}
              className={`mobile-affiliate-tab-button ${activeTab === 'payouts' ? 'active' : ''}`}
            >
              Last 4 Payout
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`mobile-affiliate-tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
            >
              Last 4 Transaction
            </button>
            <button
              onClick={() => setActiveTab('request')}
              className={`mobile-affiliate-tab-button ${activeTab === 'request' ? 'active' : ''}`}
            >
              Request Payout
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'transactions' && (
            <div className="mobile-affiliate-tab-content">
              <div className="mobile-affiliate-section-card">
                <h3 className="mobile-affiliate-tab-title">Last 5 Transactions</h3>

                <div className="mobile-affiliate-transactions-table">
                  <div className="mobile-affiliate-table-header">
                    <div className="mobile-affiliate-header-cell">Date</div>
                    <div className="mobile-affiliate-header-cell">Type</div>
                    <div className="mobile-affiliate-header-cell">Commission</div>
                  </div>

                  {dashboardData?.recent_transactions.length ? (
                    dashboardData.recent_transactions.map((transaction, index) => (
                      <div key={index} className="mobile-affiliate-table-row">
                        <div className="mobile-affiliate-table-cell">{transaction.date}</div>
                        <div className="mobile-affiliate-table-cell">{transaction.type}</div>
                        <div className="mobile-affiliate-table-cell amount">{formatCurrency(transaction.commission)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="mobile-affiliate-table-row">
                      <div className="mobile-affiliate-table-cell" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>No transactions yet</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payouts' && (
            <div className="mobile-affiliate-tab-content">
              <div className="mobile-affiliate-section-card">
                <h3 className="mobile-affiliate-tab-title">Last Four Payouts</h3>

                <div className="mobile-affiliate-payouts-table">
                  <div className="mobile-affiliate-payouts-header">
                    <div className="mobile-affiliate-header-cell">Date</div>
                    <div className="mobile-affiliate-header-cell">Status</div>
                    <div className="mobile-affiliate-header-cell">Amount</div>
                  </div>

                  {dashboardData?.recent_payouts.length ? (
                    dashboardData.recent_payouts.map((payout, index) => (
                      <div key={index} className="mobile-affiliate-payouts-row">
                        <div className="mobile-affiliate-payouts-cell">{payout.date}</div>
                        <div className="mobile-affiliate-payouts-cell status">{payout.status}</div>
                        <div className="mobile-affiliate-payouts-cell amount">{formatCurrency(payout.amount)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="mobile-affiliate-payouts-row">
                      <div className="mobile-affiliate-payouts-cell" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>No payouts yet</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'request' && (
            <div className="mobile-affiliate-tab-content">
              <div className="mobile-affiliate-section-card">
                <h3 className="mobile-affiliate-tab-title">Request Payout</h3>

                <div className="mobile-affiliate-payout-form">
                  <button
                    className="mobile-affiliate-withdraw-button"
                    onClick={handleRequestPayout}
                    disabled={requestingPayout || !dashboardData?.stats.available_balance}
                  >
                    {requestingPayout ? 'Requesting...' : 'Withdraw Now'}
                  </button>

                  {dashboardData?.bank_details ? (
                    <div className="mobile-affiliate-saved-account">
                      Saved: {dashboardData.bank_details.account_name} — {dashboardData.bank_details.bank_name} ({dashboardData.bank_details.account_number})
                    </div>
                  ) : (
                    <div className="mobile-affiliate-saved-account" style={{ color: 'red' }}>
                      No bank account saved. Please save your bank details to request payouts.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MobileAffiliatePage