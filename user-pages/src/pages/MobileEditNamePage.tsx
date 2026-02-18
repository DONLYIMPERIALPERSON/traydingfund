import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileEditNamePage.css'

const MobileEditNamePage: React.FC = () => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('John Doe')
  const [otp, setOtp] = useState('')
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleBack = () => {
    navigate(-1)
  }

  const handleRequestOtp = () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      setShowOtpInput(true)
    }, 2000)
  }

  const handleSaveChanges = () => {
    if (otp.length === 6) {
      setIsLoading(true)
      // Simulate API call
      setTimeout(() => {
        setIsLoading(false)
        // Navigate back to profile
        navigate('/profile')
      }, 2000)
    }
  }

  return (
    <div className="mobile-edit-name-page">
      <div className="mobile-edit-name-fixed-header">
        <div className="mobile-edit-name-header-shell">
          <div className="mobile-edit-name-header-row">
            <div className="mobile-edit-name-header-left">
              <div className="mobile-edit-name-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-edit-name-header-center">
              <span className="mobile-edit-name-header-title">Edit Full Name</span>
            </div>
            <div className="mobile-edit-name-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-edit-name-content-container">
        <div className="mobile-edit-name-content-padding">

          {/* Current Name Display */}
          <div className="mobile-edit-name-card" style={{marginBottom: '20px'}}>
            <div className="mobile-edit-name-card-inner">
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                <i className="fas fa-user" style={{color: '#FFD700', fontSize: '20px'}}></i>
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', margin: '0'}}>
                  Current Full Name
                </h3>
              </div>
              <div style={{fontSize: '16px', color: 'rgba(255,255,255,0.8)', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
                John Doe
              </div>
            </div>
          </div>

          {/* New Name Input */}
          <div className="mobile-edit-name-card" style={{marginBottom: '20px'}}>
            <div className="mobile-edit-name-card-inner">
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                <i className="fas fa-edit" style={{color: '#FFD700', fontSize: '20px'}}></i>
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', margin: '0'}}>
                  New Full Name
                </h3>
              </div>

              <div style={{marginBottom: '16px'}}>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>

              {!showOtpInput && (
                <button
                  onClick={handleRequestOtp}
                  disabled={isLoading || fullName.trim() === '' || fullName === 'John Doe'}
                  style={{
                    width: '100%',
                    background: isLoading ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.8)',
                    color: 'black',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      Request OTP
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* OTP Input */}
          {showOtpInput && (
            <div className="mobile-edit-name-card" style={{marginBottom: '20px'}}>
              <div className="mobile-edit-name-card-inner">
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                  <i className="fas fa-shield-alt" style={{color: '#FFD700', fontSize: '20px'}}></i>
                  <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', margin: '0'}}>
                    Verify OTP
                  </h3>
                </div>

                <div style={{marginBottom: '16px'}}>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '16px',
                      outline: 'none',
                      textAlign: 'center',
                      letterSpacing: '2px',
                      fontWeight: '600'
                    }}
                  />
                </div>

                <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px', textAlign: 'center'}}>
                  Enter the 6-digit code sent to your email
                </div>

                <button
                  onClick={handleSaveChanges}
                  disabled={isLoading || otp.length !== 6}
                  style={{
                    width: '100%',
                    background: isLoading ? 'rgba(255,215,0,0.5)' : 'rgba(255,215,0,0.8)',
                    color: 'black',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="mobile-edit-name-card" style={{background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)'}}>
            <div className="mobile-edit-name-card-inner">
              <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                <i className="fas fa-info-circle" style={{color: '#FFD700', marginTop: '2px'}}></i>
                <div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '4px'}}>
                    Security Notice
                  </div>
                  <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4'}}>
                    Changing your full name requires verification for security purposes. An OTP will be sent to your registered email address.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default MobileEditNamePage