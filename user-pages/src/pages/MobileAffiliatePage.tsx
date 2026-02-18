import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileAffiliatePage.css'

const MobileAffiliatePage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'payouts' | 'transactions' | 'request'>('payouts')
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('')

  const handleBack = () => {
    navigate(-1)
  }

  const handleCopyReferralLink = () => {
    navigator.clipboard.writeText('https://nairatrader.com/ref/ABC123')
    // You could add a toast notification here
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
                value="https://nairatrader.com/ref/ABC123"
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
                  <div className="mobile-affiliate-stat-value">₦0.00</div>
                  <div className="mobile-affiliate-stat-label">Available Balance</div>
                </div>
                <div className="mobile-affiliate-stat-divider"></div>
                <div className="mobile-affiliate-stat-item">
                  <div className="mobile-affiliate-stat-value">₦3,420.00</div>
                  <div className="mobile-affiliate-stat-label">Total Earned</div>
                </div>
                <div className="mobile-affiliate-stat-divider"></div>
                <div className="mobile-affiliate-stat-item">
                  <div className="mobile-affiliate-stat-value">1</div>
                  <div className="mobile-affiliate-stat-label">Referral</div>
                </div>
                <div className="mobile-affiliate-stat-divider"></div>
                <div className="mobile-affiliate-stat-item">
                  <div className="mobile-affiliate-stat-value">4</div>
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
                <div className="mobile-affiliate-reward-card">
                  <div className="mobile-affiliate-reward-info">
                    <div className="mobile-affiliate-reward-name">Reward: ₦600,000</div>
                    <div className="mobile-affiliate-reward-status">Status: Live</div>
                    <div className="mobile-affiliate-reward-progress">Progress: 1 / 20 • 19 left</div>
                  </div>
                  <button className="mobile-affiliate-claim-button" disabled={true}>
                    Claim
                  </button>
                </div>

                <div className="mobile-affiliate-reward-card">
                  <div className="mobile-affiliate-reward-info">
                    <div className="mobile-affiliate-reward-name">Reward: ₦800,000</div>
                    <div className="mobile-affiliate-reward-status">
                      Status: Locked <i className="fas fa-pepper-hot"></i>
                    </div>
                  </div>
                  <button className="mobile-affiliate-claim-button" disabled={true}>
                    Claim
                  </button>
                </div>

                <div className="mobile-affiliate-reward-card">
                  <div className="mobile-affiliate-reward-info">
                    <div className="mobile-affiliate-reward-name">Reward: ₦1,500,000</div>
                    <div className="mobile-affiliate-reward-status">
                      Status: Locked <i className="fas fa-pepper-hot"></i>
                    </div>
                  </div>
                  <button className="mobile-affiliate-claim-button" disabled={true}>
                    Claim
                  </button>
                </div>

                <div className="mobile-affiliate-reward-card">
                  <div className="mobile-affiliate-reward-info">
                    <div className="mobile-affiliate-reward-name">Reward: ₦1,500,000</div>
                    <div className="mobile-affiliate-reward-status">
                      Status: Locked <i className="fas fa-pepper-hot"></i>
                    </div>
                  </div>
                  <button className="mobile-affiliate-claim-button" disabled={true}>
                    Claim
                  </button>
                </div>
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

                  <div className="mobile-affiliate-table-row">
                    <div className="mobile-affiliate-table-cell">16/01/2026 6:16 am</div>
                    <div className="mobile-affiliate-table-cell">Trade with ₦800k x1</div>
                    <div className="mobile-affiliate-table-cell amount">₦3,420.00</div>
                  </div>
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

                  <div className="mobile-affiliate-payouts-row">
                    <div className="mobile-affiliate-payouts-cell">19/01/2026 8:01 am</div>
                    <div className="mobile-affiliate-payouts-cell status">Approved</div>
                    <div className="mobile-affiliate-payouts-cell amount">₦3,420.00</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'request' && (
            <div className="mobile-affiliate-tab-content">
              <div className="mobile-affiliate-section-card">
                <h3 className="mobile-affiliate-tab-title">Request Payout</h3>

                <div className="mobile-affiliate-payout-form">
                  <button className="mobile-affiliate-withdraw-button">
                    Withdraw Now
                  </button>

                  <div className="mobile-affiliate-saved-account">
                    Saved: Lucky Chi — Kuda Microfinance Bank (3000469725)
                  </div>
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