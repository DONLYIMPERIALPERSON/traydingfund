import React, { useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopAffiliatePage.css'

const DesktopAffiliatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payouts' | 'transactions' | 'request'>('payouts')
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('')

  const handleCopyReferralLink = () => {
    navigator.clipboard.writeText('https://nairatrader.com/ref/ABC123')
    // You could add a toast notification here
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
          <p>Earn commissions by referring traders to NairaTrader</p>
        </div>

        {/* Referral Link Section */}
        <div className="referral-section">
          <h3>Your Referral Link</h3>
          <div className="referral-input-group">
            <input
              type="text"
              value="https://nairatrader.com/ref/ABC123"
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
          {/* Available Balance */}
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-wallet"></i>
            </div>
            <div className="stat-value">₦0.00</div>
            <div className="stat-label">Available Balance</div>
          </div>

          {/* Total Earned */}
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="stat-value">₦3,420.00</div>
            <div className="stat-label">Total Earned</div>
          </div>

          {/* Referrals */}
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-value">1</div>
            <div className="stat-label">Referrals</div>
          </div>

          {/* Impressions */}
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-eye"></i>
            </div>
            <div className="stat-value">4</div>
            <div className="stat-label">Impressions</div>
          </div>
        </div>

        {/* Rewards Section */}
        <div className="rewards-section">
          <h3>Free Account Rewards</h3>
          <p>Earn free trading accounts by referring new traders</p>

          <div className="rewards-grid">
            {/* Reward 1 */}
            <div className="reward-card">
              <div className="reward-header">
                <div>
                  <div className="reward-title">₦600,000 Account</div>
                  <div className="reward-status live">Status: Live</div>
                  <div className="reward-progress">Progress: 1 / 20 • 19 left</div>
                </div>
                <button className="claim-button" disabled={true}>Claim</button>
              </div>
            </div>

            {/* Reward 2 */}
            <div className="reward-card">
              <div className="reward-header">
                <div>
                  <div className="reward-title">₦800,000 Account</div>
                  <div className="reward-status locked">
                    Status: Locked
                    <i className="fas fa-lock"></i>
                  </div>
                </div>
                <button className="claim-button" disabled={true}>Claim</button>
              </div>
            </div>

            {/* Reward 3 */}
            <div className="reward-card">
              <div className="reward-header">
                <div>
                  <div className="reward-title">₦1,500,000 Account</div>
                  <div className="reward-status locked">
                    Status: Locked
                    <i className="fas fa-lock"></i>
                  </div>
                </div>
                <button className="claim-button" disabled={true}>Claim</button>
              </div>
            </div>

            {/* Reward 4 */}
            <div className="reward-card">
              <div className="reward-header">
                <div>
                  <div className="reward-title">₦1,500,000 Account</div>
                  <div className="reward-status locked">
                    Status: Locked
                    <i className="fas fa-lock"></i>
                  </div>
                </div>
                <button className="claim-button" disabled={true}>Claim</button>
              </div>
            </div>
          </div>
        </div>

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

                <div className="table-row">
                  <span>16/01/2026 6:16 am</span>
                  <span>Trade with ₦800k x1</span>
                  <span>₦3,420.00</span>
                </div>
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

                <div className="payouts-row">
                  <span className="date">19/01/2026 8:01 am</span>
                  <span className="status">Approved</span>
                  <span className="amount">₦3,420.00</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'request' && (
            <div>
              <h3 className="tab-content">Request Affiliate Payout</h3>

                <div className="payout-form">
                  {/* Withdraw Button */}
                  <div className="button-group">
                    <button className="withdraw-button">Withdraw Now</button>
                  </div>

                  {/* Saved Account Info */}
                  <div className="account-info">
                    <div><strong>Saved Account:</strong> Lucky Chi — Kuda Microfinance Bank (3000469725)</div>
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

export default DesktopAffiliatePage
