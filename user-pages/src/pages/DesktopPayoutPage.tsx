import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopPayoutPage.css'
import { payoutAPI, formatCurrency, formatDate, formatTimeAgo, type PayoutSummaryResponse } from '../lib/payout'

const DesktopPayoutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request')
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [pinError, setPinError] = useState('')
  const [payoutData, setPayoutData] = useState<PayoutSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [verifyingPin, setVerifyingPin] = useState(false)

  useEffect(() => {
    const fetchPayoutData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await payoutAPI.getPayoutSummary()
        setPayoutData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payout data')
      } finally {
        setLoading(false)
      }
    }

    fetchPayoutData()
  }, [])

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

  const handleConfirmPin = async () => {
    if (!/^\d{4}$/.test(pinCode)) {
      setPinError('Enter a valid 4-digit PIN')
      return
    }

    if (!selectedAccountId) {
      setPinError('Please select an account')
      return
    }

    try {
      setVerifyingPin(true)
      setPinError('')

      // Show verification message
      setPinError('Verifying MT5 stats...')

      const response = await payoutAPI.requestPayout(selectedAccountId, pinCode)
      setShowPinModal(false)
      setPinCode('')
      alert(response.message || 'Withdrawal request submitted successfully!')

      // Refresh payout data
      const data = await payoutAPI.getPayoutSummary()
      setPayoutData(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Handle verification timeout
      if (errorMessage.includes('Verification pending')) {
        setPinError('Verification pending, please try again in a moment.')
        return
      }

      setPinError(errorMessage)
    } finally {
      setVerifyingPin(false)
    }
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

        {/* Loading/Error States */}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading payout information...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <i className="fas fa-exclamation-triangle"></i>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {/* Stats Cards */}
        {payoutData && (
          <div className="stats-grid">
            {/* Total Earned All Time */}
            <div className="stat-card" style={{backgroundColor: 'black'}}>
              <div className="stat-card-header">
                <div className="stat-icon" style={{color: 'white !important'}}>
                  <i className="fas fa-trophy"></i>
                </div>
                <div className="stat-content" style={{color: 'white !important'}}>
                  <div className="stat-label" style={{color: 'white !important'}}>Total Earned</div>
                  <div className="stat-value" style={{color: 'white !important'}}>{formatCurrency(payoutData.total_earned_all_time)}</div>
                  <div className="stat-subtitle" style={{color: 'white !important'}}>All-time earnings</div>
                </div>
              </div>
            </div>

            {/* Available Payout */}
            <div className="stat-card" style={{backgroundColor: 'black'}}>
              <div className="stat-card-header">
                <div className="stat-icon" style={{color: 'white !important'}}>
                  <i className="fas fa-money-bill-wave"></i>
                </div>
                <div className="stat-content" style={{color: 'white !important'}}>
                  <div className="stat-label" style={{color: 'white !important'}}>Available Payout</div>
                  <div className="stat-value" style={{color: 'white !important'}}>{formatCurrency(payoutData.total_available_payout)}</div>
                  <div className="stat-subtitle" style={{color: 'white !important'}}>Ready to withdraw</div>
                </div>
              </div>
            </div>
          </div>
        )}

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
          {activeTab === 'request' && payoutData && (
            <div>
              <h3 className="tab-content" style={{color: 'black !important'}}>Request New Withdrawal</h3>

              <div className="request-form">
                {/* Funded MT5 Account */}
                <div className="account-select">
                  <label className="balance-label">Select Account</label>
                  <select
                    className="account-select select"
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : null)}
                    required
                  >
                    <option value="" disabled>Select an account to withdraw from</option>
                    {payoutData.funded_accounts.map((account) => {
                      const canWithdraw = account.available_payout >= account.minimum_withdrawal_amount
                      return (
                        <option
                          key={account.account_id}
                          value={account.account_id}
                          disabled={!canWithdraw}
                        >
                          {account.account_size} - Available: {formatCurrency(account.available_payout)}
                          {!canWithdraw && ` (Min: ${formatCurrency(account.minimum_withdrawal_amount)})`}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* Bank Account Info */}
                {payoutData.eligibility.has_verified_bank_account && (
                  <div className="bank-info">
                    <label className="balance-label">Payout Destination</label>
                    <div className="bank-details">
                      <i className="fas fa-university"></i>
                      <span>****{payoutData.eligibility.bank_account_masked}</span>
                    </div>
                  </div>
                )}

                {/* Request Button */}
                <div className="request-button-container">
                  <button
                    className="request-button"
                    onClick={handleOpenPinModal}
                    disabled={!payoutData.eligibility.is_eligible}
                  >
                    {payoutData.eligibility.is_eligible ? 'Request Withdrawal' : 'Not Eligible'}
                  </button>
                </div>

                {/* Ineligibility Reasons */}
                {!payoutData.eligibility.is_eligible && payoutData.eligibility.ineligibility_reasons.length > 0 && (
                  <div className="ineligibility-reasons">
                    <div className="ineligibility-header">
                      <i className="fas fa-info-circle"></i>
                      <span>Why you're not eligible for withdrawal:</span>
                    </div>
                    <ul className="ineligibility-list">
                      {payoutData.eligibility.ineligibility_reasons.map((reason, index) => (
                        <li key={index} className="ineligibility-item">
                          <i className="fas fa-exclamation-triangle"></i>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && payoutData && (
            <div>
              <h3 className="tab-content" style={{color: 'black !important'}}>Withdrawal History</h3>

              {payoutData.withdrawal_history.length === 0 ? (
                <div className="empty-history">
                  <i className="fas fa-history"></i>
                  <p>No withdrawal history yet</p>
                  <span>Your completed withdrawals will appear here</span>
                </div>
              ) : (
                <div className="history-list">
                  {payoutData.withdrawal_history.map((withdrawal) => (
                    <div key={withdrawal.id} className="history-item">
                      <div className="history-item-left">
                        <div className="history-icon">
                          <i className={`fas fa-${withdrawal.status === 'completed' ? 'check' : withdrawal.status === 'processing' ? 'clock' : 'times'}`}></i>
                        </div>
                        <div className="history-details">
                          <div className="history-amount">{formatCurrency(withdrawal.amount)}</div>
                          <div className="history-date">{formatDate(withdrawal.requested_at)}</div>
                          {withdrawal.reference && (
                            <div className="history-reference">Ref: {withdrawal.reference}</div>
                          )}
                        </div>
                      </div>
                      <div className="history-item-right">
                        <div className={`history-status ${withdrawal.status}`}>
                          {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                        </div>
                        <div className="history-time">
                          {formatTimeAgo(withdrawal.completed_at || withdrawal.requested_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              <button className="pin-cancel-btn" onClick={handleClosePinModal} disabled={verifyingPin}>Cancel</button>
              <button className="pin-confirm-btn" onClick={handleConfirmPin} disabled={verifyingPin}>
                {verifyingPin ? (
                  <>
                    <i className="fas fa-spinner fa-spin" style={{marginRight: '8px'}}></i>
                    Verifying...
                  </>
                ) : (
                  'Verify PIN'
                )}
              </button>
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
