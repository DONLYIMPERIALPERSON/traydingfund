import React, { useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopSettingsPage.css'

type PinModalType = 'set' | 'change' | 'reset' | null

const DesktopSettingsPage: React.FC = () => {
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

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode)
    // Here you would typically save the preference to localStorage
    // and apply the theme change to the entire app
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
    <div className="settings-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div style={{
        marginLeft: '280px', // Account for sidebar
        padding: '24px',
        paddingTop: '80px', // Add top padding to avoid header overlap
        minHeight: '100vh'
      }}>
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="back-button"
        >
          <i className="fas fa-arrow-left"></i>
          Back to Accounts Overview
        </button>

        {/* Page Header */}
        <div className="page-header">
          <h1>Settings</h1>
          <p>Customize your account preferences and manage your session</p>
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          {/* Appearance Section */}
          <div className="settings-section">
            <div className="section-header">
              <h2 className="section-title">Appearance</h2>
            </div>

            {/* Theme Toggle */}
            <div className="theme-toggle">
              <div className="theme-left">
                <i className={`fas ${isDarkMode ? 'fa-moon' : 'fa-sun'} theme-icon`}></i>
                <div className="theme-text">
                  <h3 className="theme-title">Theme</h3>
                  <p className="theme-subtitle">
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleThemeToggle}
                className={`toggle-switch ${isDarkMode ? 'active' : ''}`}
              >
                <div className="toggle-slider">
                  <i className={`fas ${isDarkMode ? 'fa-moon' : 'fa-sun'} toggle-icon`}></i>
                </div>
              </button>
            </div>

            <div className="theme-toggle">
              <div className="theme-left">
                <i className="fas fa-certificate theme-icon"></i>
                <div className="theme-text">
                  <h3 className="theme-title">Use Nick Name for Certificates</h3>
                  <p className="theme-subtitle">
                    {useNickNameForCertificates ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleNickNameToggle}
                className={`toggle-switch ${useNickNameForCertificates ? 'active' : ''}`}
              >
                <div className="toggle-slider">
                  <i className={`fas ${useNickNameForCertificates ? 'fa-user' : 'fa-id-card'} toggle-icon`}></i>
                </div>
              </button>
            </div>
          </div>

          {/* Security Section */}
          <div className="settings-section">
            <div className="section-header">
              <h2 className="section-title">Security</h2>
            </div>

            <button className="settings-action-item" onClick={handleSetPin}>
              <div className="settings-action-left">
                <i className="fas fa-key settings-action-icon"></i>
                <div className="settings-action-text">
                  <h3>Set PIN</h3>
                  <p>Create transaction PIN for secure actions</p>
                </div>
              </div>
              <i className="fas fa-chevron-right settings-action-chevron"></i>
            </button>

            <button className="settings-action-item" onClick={handleChangePin}>
              <div className="settings-action-left">
                <i className="fas fa-pen settings-action-icon"></i>
                <div className="settings-action-text">
                  <h3>Change PIN</h3>
                  <p>Update your current transaction PIN</p>
                </div>
              </div>
              <i className="fas fa-chevron-right settings-action-chevron"></i>
            </button>

            <button className="settings-action-item settings-action-item-last" onClick={handleResetPin}>
              <div className="settings-action-left">
                <i className="fas fa-rotate-left settings-action-icon"></i>
                <div className="settings-action-text">
                  <h3>Reset PIN</h3>
                  <p>Recover access if you forgot your PIN</p>
                </div>
              </div>
              <i className="fas fa-chevron-right settings-action-chevron"></i>
            </button>
          </div>


        </div>
      </div>

      {activePinModal && (
        <div className="settings-pin-modal-overlay" onClick={handleClosePinModal}>
          <div className="settings-pin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-pin-modal-header">
              <h3>
                {activePinModal === 'set' && 'Set PIN'}
                {activePinModal === 'change' && 'Change PIN'}
                {activePinModal === 'reset' && 'Reset PIN'}
              </h3>
              <button className="settings-pin-close" onClick={handleClosePinModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p className="settings-pin-subtitle">
              {activePinModal === 'set' && 'Enter New PIN, Confirm PIN and OTP'}
              {activePinModal === 'change' && 'Enter Old PIN and New PIN'}
              {activePinModal === 'reset' && 'Enter OTP, New PIN and Confirm PIN'}
            </p>

            <div className="settings-pin-fields">
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
                <div className="settings-pin-otp-row">
                  <input
                    type="text"
                    placeholder="OTP"
                    value={pinForm.otp}
                    onChange={(e) => handlePinFieldChange('otp', e.target.value)}
                  />
                  <button type="button" className="settings-pin-otp-send" onClick={handleSendOtp}>
                    Send
                  </button>
                </div>
              )}
            </div>

            {pinFormError && <div className="settings-pin-error">{pinFormError}</div>}

            <div className="settings-pin-actions">
              <button className="settings-pin-cancel" onClick={handleClosePinModal}>Cancel</button>
              <button className="settings-pin-submit" onClick={handleSubmitPinModal}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopSettingsPage
