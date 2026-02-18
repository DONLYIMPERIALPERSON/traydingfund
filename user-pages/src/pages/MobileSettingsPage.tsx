import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileSettingsPage.css'

type PinModalType = 'set' | 'change' | 'reset' | null

const MobileSettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [useNickNameForCertificates, setUseNickNameForCertificates] = useState(false)
  const [activePinModal, setActivePinModal] = useState<PinModalType>(null)
  const [pinForm, setPinForm] = useState({
    oldPin: '',
    newPin: '',
    confirmPin: '',
    otp: ''
  })
  const [pinFormError, setPinFormError] = useState('')

  const handleBack = () => {
    navigate(-1)
  }

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode)
    // Here you would typically save the preference to localStorage
    // and apply the theme change to the entire app
  }

  const handleLogout = () => {
    // Handle logout logic here
    // Clear user session, tokens, etc.
    // Navigate to login page
    console.log('Logout clicked')
    // navigate('/login') // Uncomment when login page exists
  }

  const resetPinForm = () => {
    setPinForm({ oldPin: '', newPin: '', confirmPin: '', otp: '' })
    setPinFormError('')
  }

  const handleOpenPinModal = (type: Exclude<PinModalType, null>) => {
    resetPinForm()
    setActivePinModal(type)
  }

  const handleClosePinModal = () => {
    setActivePinModal(null)
    resetPinForm()
  }

  const handleSetPin = () => {
    handleOpenPinModal('set')
  }

  const handleChangePin = () => {
    handleOpenPinModal('change')
  }

  const handleResetPin = () => {
    handleOpenPinModal('reset')
  }

  const handleNickNameToggle = () => {
    setUseNickNameForCertificates(!useNickNameForCertificates)
  }

  const handlePinFieldChange = (field: keyof typeof pinForm, value: string) => {
    const maxLen = field === 'otp' ? 6 : 4
    const digitsOnly = value.replace(/\D/g, '').slice(0, maxLen)
    setPinForm(prev => ({ ...prev, [field]: digitsOnly }))
    if (pinFormError) setPinFormError('')
  }

  const handleSubmitPinModal = () => {
    if (activePinModal === 'set') {
      if (!/^\d{4}$/.test(pinForm.newPin)) return setPinFormError('New PIN must be 4 digits')
      if (pinForm.confirmPin !== pinForm.newPin) return setPinFormError('PIN confirmation does not match')
      if (!/^\d{6}$/.test(pinForm.otp)) return setPinFormError('OTP must be 6 digits')
    }

    if (activePinModal === 'change') {
      if (!/^\d{4}$/.test(pinForm.oldPin)) return setPinFormError('Old PIN must be 4 digits')
      if (!/^\d{4}$/.test(pinForm.newPin)) return setPinFormError('New PIN must be 4 digits')
    }

    if (activePinModal === 'reset') {
      if (!/^\d{6}$/.test(pinForm.otp)) return setPinFormError('OTP must be 6 digits')
      if (!/^\d{4}$/.test(pinForm.newPin)) return setPinFormError('New PIN must be 4 digits')
      if (pinForm.confirmPin !== pinForm.newPin) return setPinFormError('PIN confirmation does not match')
    }

    console.log('PIN action submitted:', activePinModal, pinForm)
    handleClosePinModal()
  }

  const handleSendOtp = () => {
    console.log('Send OTP clicked for:', activePinModal)
  }

  return (
    <div className="mobile-settings-page">
      <div className="mobile-settings-fixed-header">
        <div className="mobile-settings-header-shell">
          <div className="mobile-settings-header-row">
            <div className="mobile-settings-header-left">
              <div className="mobile-settings-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-settings-header-center">
              <span className="mobile-settings-header-title">Settings</span>
            </div>
            <div className="mobile-settings-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-settings-content-container">
        <div className="mobile-settings-content-padding">

          {/* Theme Toggle */}
          <div className="mobile-settings-card" style={{marginBottom: '16px'}}>
            <div className="mobile-settings-card-inner">
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <i className={isDarkMode ? "fas fa-moon" : "fas fa-sun"} style={{color: '#FFD700', fontSize: '20px'}}></i>
                  <div>
                    <div style={{fontSize: '16px', fontWeight: '600', color: 'white'}}>
                      Theme
                    </div>
                    <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>
                      {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleThemeToggle}
                  style={{
                    position: 'relative',
                    width: '50px',
                    height: '26px',
                    background: isDarkMode ? '#333' : '#ddd',
                    borderRadius: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: isDarkMode ? '24px' : '2px',
                    width: '22px',
                    height: '22px',
                    background: isDarkMode ? '#FFD700' : '#fff',
                    borderRadius: '50%',
                    transition: 'left 0.3s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    <i className={isDarkMode ? "fas fa-moon" : "fas fa-sun"} style={{
                      fontSize: '10px',
                      color: isDarkMode ? '#000' : '#FFD700',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}></i>
                  </div>
                </button>
              </div>

              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '0.5px solid rgba(255,255,255,0.08)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <i className="fas fa-certificate" style={{color: '#FFD700', fontSize: '20px'}}></i>
                  <div>
                    <div style={{fontSize: '16px', fontWeight: '600', color: 'white'}}>
                      Use Nick Name for Certificates
                    </div>
                    <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>
                      {useNickNameForCertificates ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleNickNameToggle}
                  style={{
                    position: 'relative',
                    width: '50px',
                    height: '26px',
                    background: useNickNameForCertificates ? '#333' : '#ddd',
                    borderRadius: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: useNickNameForCertificates ? '24px' : '2px',
                    width: '22px',
                    height: '22px',
                    background: useNickNameForCertificates ? '#FFD700' : '#fff',
                    borderRadius: '50%',
                    transition: 'left 0.3s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    <i className={useNickNameForCertificates ? "fas fa-user" : "fas fa-id-card"} style={{
                      fontSize: '10px',
                      color: useNickNameForCertificates ? '#000' : '#FFD700',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}></i>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* PIN Settings */}
          <div className="mobile-settings-card" style={{marginBottom: '16px'}}>
            <div className="mobile-settings-card-inner">
              <button className="mobile-settings-action-item" onClick={handleSetPin}>
                <div className="mobile-settings-action-left">
                  <i className="fas fa-key mobile-settings-action-icon"></i>
                  <div className="mobile-settings-action-text">
                    <div className="mobile-settings-action-title">Set PIN</div>
                    <div className="mobile-settings-action-subtitle">Create transaction PIN</div>
                  </div>
                </div>
                <i className="fas fa-chevron-right mobile-settings-action-chevron"></i>
              </button>

              <button className="mobile-settings-action-item" onClick={handleChangePin}>
                <div className="mobile-settings-action-left">
                  <i className="fas fa-pen mobile-settings-action-icon"></i>
                  <div className="mobile-settings-action-text">
                    <div className="mobile-settings-action-title">Change PIN</div>
                    <div className="mobile-settings-action-subtitle">Update current PIN</div>
                  </div>
                </div>
                <i className="fas fa-chevron-right mobile-settings-action-chevron"></i>
              </button>

              <button className="mobile-settings-action-item mobile-settings-action-item-last" onClick={handleResetPin}>
                <div className="mobile-settings-action-left">
                  <i className="fas fa-rotate-left mobile-settings-action-icon"></i>
                  <div className="mobile-settings-action-text">
                    <div className="mobile-settings-action-title">Reset PIN</div>
                    <div className="mobile-settings-action-subtitle">Recover forgotten PIN</div>
                  </div>
                </div>
                <i className="fas fa-chevron-right mobile-settings-action-chevron"></i>
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="mobile-settings-card">
            <div className="mobile-settings-card-inner">
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0'
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <i className="fas fa-sign-out-alt" style={{color: '#e74c3c', fontSize: '20px'}}></i>
                  <div>
                    <div style={{fontSize: '16px', fontWeight: '600', textAlign: 'left'}}>
                      Logout
                    </div>
                    <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)', textAlign: 'left'}}>
                      Sign out of your account
                    </div>
                  </div>
                </div>
                <i className="fas fa-chevron-right" style={{color: 'rgba(255,255,255,0.5)'}}></i>
              </button>
            </div>
          </div>

        </div>
      </div>

      {activePinModal && (
        <div className="mobile-settings-pin-modal-overlay" onClick={handleClosePinModal}>
          <div className="mobile-settings-pin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-settings-pin-header">
              <h3>
                {activePinModal === 'set' && 'Set PIN'}
                {activePinModal === 'change' && 'Change PIN'}
                {activePinModal === 'reset' && 'Reset PIN'}
              </h3>
              <button onClick={handleClosePinModal} className="mobile-settings-pin-close">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p className="mobile-settings-pin-subtitle">
              {activePinModal === 'set' && 'Enter New PIN, Confirm PIN and OTP'}
              {activePinModal === 'change' && 'Enter Old PIN and New PIN'}
              {activePinModal === 'reset' && 'Enter OTP, New PIN and Confirm PIN'}
            </p>

            <div className="mobile-settings-pin-fields">
              {activePinModal === 'change' && (
                <input
                  type="password"
                  placeholder="Old PIN"
                  value={pinForm.oldPin}
                  onChange={(e) => handlePinFieldChange('oldPin', e.target.value)}
                />
              )}

              {(activePinModal === 'set' || activePinModal === 'reset' || activePinModal === 'change') && (
                <input
                  type="password"
                  placeholder="New PIN"
                  value={pinForm.newPin}
                  onChange={(e) => handlePinFieldChange('newPin', e.target.value)}
                />
              )}

              {(activePinModal === 'set' || activePinModal === 'reset') && (
                <input
                  type="password"
                  placeholder="Confirm PIN"
                  value={pinForm.confirmPin}
                  onChange={(e) => handlePinFieldChange('confirmPin', e.target.value)}
                />
              )}

              {(activePinModal === 'set' || activePinModal === 'reset') && (
                <div className="mobile-settings-pin-otp-row">
                  <input
                    type="text"
                    placeholder="OTP"
                    value={pinForm.otp}
                    onChange={(e) => handlePinFieldChange('otp', e.target.value)}
                  />
                  <button type="button" className="mobile-settings-pin-otp-send" onClick={handleSendOtp}>
                    Send
                  </button>
                </div>
              )}
            </div>

            {pinFormError && <div className="mobile-settings-pin-error">{pinFormError}</div>}

            <div className="mobile-settings-pin-actions">
              <button onClick={handleClosePinModal} className="mobile-settings-pin-cancel">Cancel</button>
              <button onClick={handleSubmitPinModal} className="mobile-settings-pin-submit">Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileSettingsPage