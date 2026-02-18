import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobilePayoutPage.css'

const MobilePayoutPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request')
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [pinError, setPinError] = useState('')

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

          {/* Combined Stats Card */}
          <div className="mobile-payout-card" style={{marginBottom: '24px'}}>
            <div className="mobile-payout-card-inner">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                {/* Total Withdrawn - Left */}
                <div style={{flex: 1}}>
                  <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px'}}>Total Withdrawn</div>
                  <div style={{fontSize: '14px', fontWeight: '700', color: '#FFD700'}}>₦2,450,000</div>
                  <div style={{fontSize: '8px', color: 'rgba(255,255,255,0.5)'}}>All-time</div>
                </div>

                {/* Divider */}
                <div style={{width: '1px', height: '40px', background: 'rgba(255,255,255,0.1)', margin: '0 12px'}}></div>

                {/* Last Withdrawal - Right */}
                <div style={{flex: 1}}>
                  <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px'}}>Last Withdrawal</div>
                  <div style={{fontSize: '14px', fontWeight: '700', color: '#FFD700'}}>₦150,000</div>
                  <div style={{fontSize: '8px', color: 'rgba(255,255,255,0.5)'}}>2.5 hrs</div>
                </div>
              </div>
            </div>
          </div>

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
          {activeTab === 'request' && (
            <div className="mobile-payout-card">
              <div className="mobile-payout-card-inner">
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px'}}>Request New Withdrawal</h3>

                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div>
                    <label style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px'}}>
                      Available Balance
                    </label>
                    <div style={{fontSize: '20px', fontWeight: '700', color: '#FFD700'}}>₦450,000</div>
                  </div>

                  <div>
                    <label style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px'}}>
                      Funded MT5 Account
                    </label>
                    <select
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
                    >
                      <option value="200k">200k Account - Balance: ₦150,000</option>
                    </select>
                  </div>

                  <button
                    onClick={handleOpenPinModal}
                    style={{
                      width: '100%',
                      background: 'rgba(255,215,0,0.8)',
                      color: 'black',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginTop: '8px'
                    }}
                  >
                    Request Withdrawal
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="mobile-payout-card">
              <div className="mobile-payout-card-inner">
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px'}}>Withdrawal History</h3>

                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  {/* Sample withdrawal items */}
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
                    <div>
                      <div style={{fontSize: '16px', fontWeight: '600', color: 'white'}}>₦150,000</div>
                      <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>Dec 15, 2024</div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: '14px', color: '#FFD700', fontWeight: '600'}}>Completed</div>
                      <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)'}}>2.5 hrs</div>
                    </div>
                  </div>

                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
                    <div>
                      <div style={{fontSize: '16px', fontWeight: '600', color: 'white'}}>₦200,000</div>
                      <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>Dec 10, 2024</div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: '14px', color: '#FFD700', fontWeight: '600'}}>Completed</div>
                      <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)'}}>3.2 hrs</div>
                    </div>
                  </div>

                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
                    <div>
                      <div style={{fontSize: '16px', fontWeight: '600', color: 'white'}}>₦100,000</div>
                      <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>Dec 8, 2024</div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: '14px', color: '#FFD700', fontWeight: '600'}}>Completed</div>
                      <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)'}}>1.8 hrs</div>
                    </div>
                  </div>
                </div>
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
              <button className="mobile-pin-cancel-btn" onClick={handleClosePinModal}>Cancel</button>
              <button className="mobile-pin-confirm-btn" onClick={handleConfirmPin}>Verify PIN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobilePayoutPage