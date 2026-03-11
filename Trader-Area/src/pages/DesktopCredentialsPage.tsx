import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import { fetchUserChallengeAccountDetail, type UserChallengeAccountDetailResponse } from '../lib/auth'
import '../styles/DesktopCredentialsPage.css'

const DesktopCredentialsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [accountData, setAccountData] = useState<UserChallengeAccountDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const challengeId = searchParams.get('challenge_id')

  useEffect(() => {
    if (!challengeId) {
      setError('Challenge ID is required')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    fetchUserChallengeAccountDetail(challengeId)
      .then((data) => {
        setAccountData(data)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load account details')
      })
      .finally(() => setLoading(false))
  }, [challengeId])

  if (loading) {
    return (
      <div className="desktop-credentials-page">
        <DesktopHeader />
        <DesktopSidebar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>
          Loading account details...
        </div>
      </div>
    )
  }

  if (error || !accountData) {
    return (
      <div className="desktop-credentials-page">
        <DesktopHeader />
        <DesktopSidebar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff8b8b' }}>
          {error || 'Account not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="desktop-credentials-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="credentials-content">
        {/* Back Button */}
        <div className="back-button">
          <button onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left"></i>
            Back to Accounts Overview
          </button>
        </div>

        {/* Page Header */}
        <div className="page-header">
          <h1>Account Credentials</h1>
          <p>Secure login information for your trading account</p>
        </div>

        {/* Credentials Header */}
        <div className="credentials-header">
          <div className="credentials-header-content">
            <div className="credentials-header-left">
              <span className="credentials-header-title">MT5 PLATFORM</span>
            </div>
            <div className="encrypted-badge">
              <i className="fas fa-shield"></i>
              Encrypted
            </div>
          </div>
        </div>

        {/* Credentials List */}
        <div className="credentials-list">
          {/* Server */}
          <div className="credential-card">
            <div className="credential-content">
              <div className="credential-info">
                <div className="credential-icon server-icon">
                  <i className="fas fa-server"></i>
                </div>
                <div className="credential-details">
                  <div className="credential-label">Server</div>
                  <div className="credential-value">{accountData.credentials?.server || 'N/A'}</div>
                </div>
              </div>
              <button
                className="action-button"
                onClick={() => navigator.clipboard.writeText(accountData.credentials?.server || '')}
              >
                <i className="fas fa-copy"></i>
                Copy
              </button>
            </div>
          </div>

          {/* Account Number */}
          <div className="credential-card">
            <div className="credential-content">
              <div className="credential-info">
                <div className="credential-icon account-icon">
                  <i className="fas fa-hashtag"></i>
                </div>
                <div className="credential-details">
                  <div className="credential-label">Account Number</div>
                  <div className="credential-value">{accountData.credentials?.account_number || 'N/A'}</div>
                </div>
              </div>
              <button
                className="action-button"
                onClick={() => navigator.clipboard.writeText(accountData.credentials?.account_number || '')}
              >
                <i className="fas fa-copy"></i>
                Copy
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="credential-card">
            <div className="credential-content">
              <div className="credential-info">
                <div className="credential-icon password-icon">
                  <i className="fas fa-key"></i>
                </div>
                <div className="credential-details">
                  <div className="credential-label">Password</div>
                  <div className="credential-value">
                    {showPassword ? (accountData.credentials?.password || 'N/A') : '••••••••••••'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {showPassword && (
                  <button
                    className="action-button"
                    onClick={() => navigator.clipboard.writeText(accountData.credentials?.password || '')}
                  >
                    <i className="fas fa-copy"></i>
                    Copy
                  </button>
                )}
                <button
                  className="action-button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopCredentialsPage