import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopPayoutPage.css'
import { payoutAPI, formatCurrency, formatDate, formatTime, formatTimeAgo, type PayoutSummaryResponse } from '../lib/payoutApi'
import {
  fetchBankAccountProfile,
  fetchCryptoPayoutProfile,
  fetchProfile,
  fetchKycHistory,
  type BankAccountProfile,
  type CryptoPayoutProfile,
} from '../lib/traderAuth'

const PayoutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request')
  const [requestingPayout, setRequestingPayout] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [payoutData, setPayoutData] = useState<PayoutSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [bankProfile, setBankProfile] = useState<BankAccountProfile | null>(null)
  const [cryptoProfile, setCryptoProfile] = useState<CryptoPayoutProfile | null>(null)
  const [kycStatus, setKycStatus] = useState('not_started')

  const navigate = useNavigate()

  const normalizeStatus = (status: string) => status.replace(/_/g, ' ').toLowerCase()
  const resolveStatusLabel = (status: string) => {
    if (status === 'pending_approval') return 'Pending approval'
    if (status === 'processing') return 'Processing'
    if (status === 'failed') return 'Pending approval'
    if (status === 'completed') return 'Completed'
    return normalizeStatus(status)
  }

  const resolveStatusClass = (status: string) => {
    if (status === 'pending_approval' || status === 'failed') return 'pending'
    if (status === 'processing') return 'processing'
    if (status === 'completed') return 'completed'
    return 'pending'
  }

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

  useEffect(() => {
    const loadPayoutMethods = async () => {
      try {
        const [payoutProfile, cryptoPayoutProfile, profileRes, historyRes] = await Promise.all([
          fetchBankAccountProfile(),
          fetchCryptoPayoutProfile(),
          fetchProfile(),
          fetchKycHistory(),
        ])
        setBankProfile(payoutProfile)
        setCryptoProfile(cryptoPayoutProfile)

        const historyItems = historyRes.requests ?? []
        const latestRequestStatus = historyItems[0]?.status?.toLowerCase()
        const profileStatus = (profileRes.kyc_status || 'not_started').toLowerCase()
        setKycStatus(latestRequestStatus || profileStatus)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payout methods.')
      }
    }

    void loadPayoutMethods()
  }, [])

  const hasPayoutMethod = Boolean(bankProfile || cryptoProfile)
  const isKycVerified = ['verified', 'approved'].includes(kycStatus)
  const availableAccounts = payoutData
    ? payoutData.funded_accounts.filter((account) => !account.has_pending_request)
    : []
  const availablePayoutTotal = availableAccounts.reduce((sum, account) => sum + account.available_payout, 0)
  const kycLockedTitle = kycStatus === 'pending'
    ? 'KYC verification in progress'
    : kycStatus === 'declined'
      ? 'KYC verification declined'
      : 'Complete KYC to unlock withdrawals'
  const kycLockedMessage = kycStatus === 'pending'
    ? 'Your KYC submission is under review. Withdrawals will unlock once it is approved.'
    : kycStatus === 'declined'
      ? 'Your KYC needs attention. Please resubmit your documents to unlock withdrawals.'
      : 'Please verify your identity before requesting or setting up withdrawals.'

  const handleRequestPayout = async () => {
    if (!selectedAccountId) {
      setRequestError('Please select an account')
      return
    }

    try {
      setRequestingPayout(true)
      setRequestError('')

      const response = await payoutAPI.requestPayout(selectedAccountId)
      alert(response.message || 'Withdrawal request submitted successfully!')

      // Refresh payout data
      const data = await payoutAPI.getPayoutSummary()
      setPayoutData(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setRequestError(errorMessage)
    } finally {
      setRequestingPayout(false)
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

        {!loading && !error && !isKycVerified ? (
          <div className="kyc-lock-card">
            <div className="kyc-lock-icon">
              <i className="fas fa-lock"></i>
            </div>
            <div>
              <h2>{kycLockedTitle}</h2>
              <p>{kycLockedMessage}</p>
            </div>
            <div className="kyc-lock-actions">
              <button type="button" onClick={() => navigate('/kyc')}>
                Go to KYC
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {payoutData && (
              <div className="stats-grid">
                {/* Total Earned All Time */}
                <div className="stat-card payout-highlight">
                  <div className="stat-card-header">
                    <div className="stat-icon">
                      <i className="fas fa-trophy"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Total Earned</div>
                      <div className="stat-value">{formatCurrency(payoutData.total_earned_all_time)}</div>
                      <div className="stat-subtitle">All-time earnings</div>
                    </div>
                  </div>
                </div>

                {/* Available Payout */}
                <div className="stat-card payout-highlight">
                  <div className="stat-card-header">
                    <div className="stat-icon">
                      <i className="fas fa-money-bill-wave"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Available Payout</div>
                      <div className="stat-value">{formatCurrency(availablePayoutTotal)}</div>
                      <div className="stat-subtitle">Ready to withdraw</div>
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
                  <h3 className="tab-content">Request New Withdrawal</h3>

                  {!hasPayoutMethod ? (
                    <div className="payout-method-required">
                      <div className="payout-method-required-icon">
                        <i className="fas fa-wallet"></i>
                      </div>
                      <div>
                        <h4>Set a payout method first</h4>
                        <p>Please add your bank transfer or crypto wallet in Settings before requesting a withdrawal.</p>
                      </div>
                      <button type="button" onClick={() => navigate('/settings')}>
                        Go to Settings
                      </button>
                    </div>
                  ) : (
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
                        {availableAccounts.map((account) => {
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
                        onClick={handleRequestPayout}
                        disabled={!payoutData.eligibility.is_eligible || requestingPayout}
                      >
                        {requestingPayout ? 'Submitting...' : payoutData.eligibility.is_eligible ? 'Request Withdrawal' : 'Not Eligible'}
                      </button>
                    </div>

                    {requestError && (
                      <div className="ineligibility-reasons">
                        <div className="ineligibility-header">
                          <i className="fas fa-exclamation-triangle"></i>
                          <span>{requestError}</span>
                        </div>
                      </div>
                    )}

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
                  )}
                </div>
              )}

              {activeTab === 'history' && payoutData && (
                <div>
                  <h3 className="tab-content">Withdrawal History</h3>

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
                              <div className="history-date">
                                {formatDate(withdrawal.requested_at)} • {formatTime(withdrawal.requested_at)}
                              </div>
                              {withdrawal.mt5_account_number && (
                                <div className="history-reference">CTrader: {withdrawal.mt5_account_number}</div>
                              )}
                              {withdrawal.reference && (
                                <div className="history-reference">Ref: {withdrawal.reference}</div>
                              )}
                            </div>
                          </div>
                          <div className="history-item-right">
                            <div className={`history-status ${resolveStatusClass(withdrawal.status)}`}>
                              {resolveStatusLabel(withdrawal.status)}
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
          </>
        )}
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default PayoutPage
