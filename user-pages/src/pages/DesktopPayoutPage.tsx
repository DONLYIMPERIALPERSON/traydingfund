import React, { useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopPayoutPage.css'

const DesktopPayoutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request')
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [pinError, setPinError] = useState('')

  const handleOpenPinModal = () => {
    setPinCode('')
    setPinError('')
    setShowPinModal(true)
  }

  const handleClosePinModal = () => {
    setShowPinModal(false)
    setPinCode('')
    setPinError('')
  }

  const handleConfirmPin = () => {
    if (!/^\d{4}$/.test(pinCode)) {
      setPinError('Enter a valid 4-digit PIN')
      return
    }

    setShowPinModal(false)
    setPinCode('')
    setPinError('')
    alert('PIN verified. Withdrawal request submitted.')
  }

  return (
    <div className="payout-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="payout-content">
        {/* Back Button */}
        <div className="back-button">
          <button onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left"></i>
            Back to Accounts Overview
          </button>
        </div>

        {/* Page Header */}
        <div className="page-header">
          <h1>Withdrawals</h1>
          <p>Request and track your payouts</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          {/* Total Withdrawn */}
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon">
                <i className="fas fa-wallet"></i>
              </div>
              <div className="stat-content">
                <div className="stat-label">Total Withdrawn</div>
                <div className="stat-value">₦2,450,000</div>
                <div className="stat-subtitle">All-time</div>
              </div>
            </div>
          </div>

          {/* Last Withdrawal */}
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-content">
                <div className="stat-label">Last Withdrawal</div>
                <div className="stat-value">₦150,000</div>
                <div className="stat-subtitle">2.5 hrs ago</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-section">
          <div className="tabs-container">
            <button
              onClick={() => setActiveTab('request')}
              className={`tab-button ${activeTab === 'request' ? 'active' : ''}`}
            >
              Request Withdrawal
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            >
              History
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'request' && (
            <div>
              <h3 className="tab-content">Request New Withdrawal</h3>

              <div className="request-form">
                {/* Available Balance */}
                <div className="balance-card">
                  <label className="balance-label">Available Balance</label>
                  <div className="balance-value">₦450,000</div>
                </div>

                {/* Funded MT5 Account */}
                <div className="account-select">
                  <label className="balance-label">Funded MT5 Account</label>
                  <select className="account-select select">
                    <option value="200k">200k Account - Balance: ₦150,000</option>
                  </select>
                </div>

                {/* Request Button */}
                <div className="request-button-container">
                  <button className="request-button" onClick={handleOpenPinModal}>Request Withdrawal</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 className="tab-content">Withdrawal History</h3>

              <div className="history-list">
                {/* History Items */}
                <div className="history-item">
                  <div className="history-item-left">
                    <div className="history-icon">
                      <i className="fas fa-check"></i>
                    </div>
                    <div className="history-details">
                      <div className="history-amount">₦150,000</div>
                      <div className="history-date">Dec 15, 2024</div>
                    </div>
                  </div>
                  <div className="history-item-right">
                    <div className="history-status">Completed</div>
                    <div className="history-time">2.5 hrs ago</div>
                  </div>
                </div>

                <div className="history-item">
                  <div className="history-item-left">
                    <div className="history-icon">
                      <i className="fas fa-check"></i>
                    </div>
                    <div className="history-details">
                      <div className="history-amount">₦200,000</div>
                      <div className="history-date">Dec 10, 2024</div>
                    </div>
                  </div>
                  <div className="history-item-right">
                    <div className="history-status">Completed</div>
                    <div className="history-time">3.2 hrs ago</div>
                  </div>
                </div>

                <div className="history-item">
                  <div className="history-item-left">
                    <div className="history-icon">
                      <i className="fas fa-check"></i>
                    </div>
                    <div className="history-details">
                      <div className="history-amount">₦100,000</div>
                      <div className="history-date">Dec 8, 2024</div>
                    </div>
                  </div>
                  <div className="history-item-right">
                    <div className="history-status">Completed</div>
                    <div className="history-time">1.8 hrs ago</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPinModal && (
        <div className="pin-modal-overlay" onClick={handleClosePinModal}>
          <div className="pin-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Verify Withdrawal</h3>
            <p>Enter your transaction PIN to continue.</p>
            <input
              type="password"
              value={pinCode}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4)
                setPinCode(digitsOnly)
                if (pinError) setPinError('')
              }}
              placeholder="Enter 4-digit PIN"
              className="pin-modal-input"
            />
            {pinError && <div className="pin-modal-error">{pinError}</div>}
            <div className="pin-modal-actions">
              <button className="pin-cancel-btn" onClick={handleClosePinModal}>Cancel</button>
              <button className="pin-confirm-btn" onClick={handleConfirmPin}>Verify PIN</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopPayoutPage
