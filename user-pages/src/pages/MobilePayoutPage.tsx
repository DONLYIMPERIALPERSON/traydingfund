import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobilePayoutPage.css'
import { payoutAPI, formatCurrency, formatDate, formatTime, formatTimeAgo, type PayoutSummaryResponse } from '../lib/payout'

const MobilePayoutPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request')
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [pinError, setPinError] = useState('')
  const [payoutData, setPayoutData] = useState<PayoutSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [verifyingPin, setVerifyingPin] = useState(false)

  const normalizeStatus = (status: string) => status.replace(/_/g, ' ').toLowerCase()
  const resolveStatusLabel = (status: string) => {
    if (status === 'pending_approval') return 'Pending approval'
    if (status === 'processing') return 'Processing'
    if (status === 'failed') return 'Pending approval'
    if (status === 'completed') return 'Completed'
    return normalizeStatus(status)
  }

  const resolveStatusColor = (status: string) => {
    if (status === 'completed') return '#FFD700'
    if (status === 'processing') return '#FFA500'
    return '#FFD700'
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

  const handleBack = () => {
    navigate(-1)
  }

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
      if (errorMessage.includes('Verification pending')) {
        setPinError('Verification pending, please try again in a moment.')
        return
      }

      setPinError(errorMessage || 'Failed to submit withdrawal request')
    } finally {
      setVerifyingPin(false)
    }
  }

  return (
    <div className="mobile-payout-page">
      <div className="mobile-payout-fixed-header">
        <div className="mobile-payout-header-shell">
          <div className="mobile-payout-header-row">
            <div className="mobile-payout-header-left">
              <div className="mobile-payout-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-payout-header-center">
              <span className="mobile-payout-header-title">Withdrawals</span>
            </div>
            <div className="mobile-payout-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-payout-content-container">
        <div style={{padding: '24px 12px'}}>
          {/* Header Description - moved outside container */}
          <div style={{marginBottom: '20px'}}>
            <p style={{fontSize: '16px', color: 'rgba(255,255,255,0.8)', margin: 0}}>
              Request and track your payouts.
            </p>
          </div>

          {/* Loading/Error States */}
          {loading && (
            <div className="mobile-loading-state">
              <div className="mobile-loading-spinner"></div>
              <p>Loading payout information...</p>
            </div>
          )}

          {error && (
            <div className="mobile-error-state">
              <i className="fas fa-exclamation-triangle"></i>
              <p>{error}</p>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}

          {/* Combined Stats Card */}
          {payoutData && (
            <div className="mobile-payout-card" style={{marginBottom: '24px'}}>
              <div className="mobile-payout-card-inner">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  {/* Total Earned - Left */}
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px'}}>Total Earned</div>
                    <div style={{fontSize: '14px', fontWeight: '700', color: '#FFD700'}}>{formatCurrency(payoutData.total_earned_all_time)}</div>
                    <div style={{fontSize: '8px', color: 'rgba(255,255,255,0.5)'}}>All-time</div>
                  </div>

                  {/* Divider */}
                  <div style={{width: '1px', height: '40px', background: 'rgba(255,255,255,0.1)', margin: '0 12px'}}></div>

                  {/* Available Payout - Right */}
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px'}}>Available Payout</div>
                    <div style={{fontSize: '14px', fontWeight: '700', color: '#FFD700'}}>{formatCurrency(payoutData.total_available_payout)}</div>
                    <div style={{fontSize: '8px', color: 'rgba(255,255,255,0.5)'}}>Ready to withdraw</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '20px'}}>
            <button
              onClick={() => setActiveTab('request')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'request' ? 'rgba(255,215,0,0.8)' : 'transparent',
                color: activeTab === 'request' ? 'black' : 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Request Withdrawal
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'history' ? 'rgba(255,215,0,0.8)' : 'transparent',
                color: activeTab === 'history' ? 'black' : 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              History
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'request' && payoutData && (
            <div className="mobile-payout-card">
              <div className="mobile-payout-card-inner">
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px'}}>Request New Withdrawal</h3>

                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div>
                    <label style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px'}}>
                      Select Account
                    </label>
                    <select
                      value={selectedAccountId || ''}
                      onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : null)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '0.5px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '16px',
                        outline: 'none'
                      }}
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
                            style={{ color: canWithdraw ? 'white' : 'rgba(255,255,255,0.5)' }}
                          >
                            {account.account_size} - Available: {formatCurrency(account.available_payout)}
                            {!canWithdraw && ` (Min: ${formatCurrency(account.minimum_withdrawal_amount)})`}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {payoutData.eligibility.has_verified_bank_account && (
                    <div>
                      <label style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px'}}>
                        Payout Destination
                      </label>
                      <div style={{display: 'flex', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
                        <i className="fas fa-university" style={{color: '#FFD700', marginRight: '12px'}}></i>
                        <span style={{color: 'white', fontSize: '14px'}}>****{payoutData.eligibility.bank_account_masked}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleOpenPinModal}
                    disabled={!payoutData.eligibility.is_eligible}
                    style={{
                      width: '100%',
                      background: payoutData.eligibility.is_eligible ? 'rgba(255,215,0,0.8)' : 'rgba(255,255,255,0.2)',
                      color: payoutData.eligibility.is_eligible ? 'black' : 'rgba(255,255,255,0.5)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: payoutData.eligibility.is_eligible ? 'pointer' : 'not-allowed',
                      marginTop: '8px'
                    }}
                  >
                    {payoutData.eligibility.is_eligible ? 'Request Withdrawal' : 'Not Eligible'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && payoutData && (
            <div className="mobile-payout-card">
              <div className="mobile-payout-card-inner">
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px'}}>Withdrawal History</h3>

                {payoutData.withdrawal_history.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '40px 20px'}}>
                    <i className="fas fa-history" style={{fontSize: '48px', color: 'rgba(255,255,255,0.3)', marginBottom: '16px'}}></i>
                    <p style={{color: 'rgba(255,255,255,0.8)', fontSize: '16px', marginBottom: '8px'}}>No withdrawal history yet</p>
                    <span style={{color: 'rgba(255,255,255,0.6)', fontSize: '14px'}}>Your completed withdrawals will appear here</span>
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                    {payoutData.withdrawal_history.map((withdrawal) => (
                      <div key={withdrawal.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
                        <div>
                          <div style={{fontSize: '16px', fontWeight: '600', color: 'white'}}>{formatCurrency(withdrawal.amount)}</div>
                          <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>
                            {formatDate(withdrawal.requested_at)} • {formatTime(withdrawal.requested_at)}
                          </div>
                          {withdrawal.mt5_account_number && (
                            <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.5)'}}>
                              MT5: {withdrawal.mt5_account_number}
                            </div>
                          )}
                          {withdrawal.reference && (
                            <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.5)'}}>Ref: {withdrawal.reference}</div>
                          )}
                        </div>
                        <div style={{textAlign: 'right'}}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: resolveStatusColor(withdrawal.status)
                          }}>
                            {resolveStatusLabel(withdrawal.status)}
                          </div>
                          <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)'}}>
                            {formatTimeAgo(withdrawal.completed_at || withdrawal.requested_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPinModal && (
        <div className="mobile-pin-modal-overlay" onClick={handleClosePinModal}>
          <div className="mobile-pin-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Verify Withdrawal</h3>
            <p>Enter your 4-digit transaction PIN.</p>
            <input
              type="password"
              value={pinCode}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4)
                setPinCode(digitsOnly)
                if (pinError) setPinError('')
              }}
              placeholder="••••"
              className="mobile-pin-modal-input"
            />
            {pinError && <div className="mobile-pin-modal-error">{pinError}</div>}
            <div className="mobile-pin-modal-actions">
              <button className="mobile-pin-cancel-btn" onClick={handleClosePinModal} disabled={verifyingPin}>Cancel</button>
              <button className="mobile-pin-confirm-btn" onClick={handleConfirmPin} disabled={verifyingPin}>
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
    </div>
  )
}

export default MobilePayoutPage