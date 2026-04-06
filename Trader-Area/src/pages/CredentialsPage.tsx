import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import { fetchUserChallengeAccountDetail, type UserChallengeAccountDetailResponse } from '../lib/traderAuth'
import '../styles/DesktopCredentialsPage.css'

const CredentialsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [accountData, setAccountData] = useState<UserChallengeAccountDetailResponse | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const normalizedPlatform = String(accountData.platform ?? '').toLowerCase()
  const serverHint = accountData?.credentials?.server?.toLowerCase().includes('mt5')
  const resolvedPlatform = normalizedPlatform || (serverHint ? 'mt5' : 'ctrader')
  const isMt5 = resolvedPlatform === 'mt5'
  const platformLabel = isMt5 ? 'MT5 PLATFORM' : 'CTRADER PLATFORM'

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
              <span className="credentials-header-title">{platformLabel}</span>
            </div>
            <div className="encrypted-badge">
              <i className="fas fa-shield"></i>
              Encrypted
            </div>
          </div>
        </div>

        {/* Credentials List */}
        <div className="credentials-list">
          {/* Broker */}
          <div className="credential-card">
            <div className="credential-content">
              <div className="credential-info">
                <div className="credential-icon broker-icon">
                  <i className="fas fa-building"></i>
                </div>
                <div className="credential-details">
                  <div className="credential-label">Broker</div>
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

          {/* Account */}
          <div className="credential-card">
            <div className="credential-content">
              <div className="credential-info">
                <div className="credential-icon account-icon">
                  <i className="fas fa-hashtag"></i>
                </div>
                <div className="credential-details">
                  <div className="credential-label">Account</div>
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
          {isMt5 && accountData.credentials?.password && (
            <div className="credential-card">
              <div className="credential-content">
                <div className="credential-info">
                  <div className="credential-icon account-icon">
                    <i className="fas fa-key"></i>
                  </div>
                  <div className="credential-details">
                    <div className="credential-label">Password</div>
                    <div className="credential-value">
                      {showPassword ? accountData.credentials?.password : '••••••••'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="action-button"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                  <button
                    className="action-button"
                    onClick={() => navigator.clipboard.writeText(accountData.credentials?.password || '')}
                  >
                    <i className="fas fa-copy"></i>
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isMt5 && (
          <div
            style={{
              marginTop: 16,
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(234,179,8,0.45)',
              background: 'rgba(234,179,8,0.16)',
              color: '#111827',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            This account has been linked to your email. Kindly login to cTrader to view or trade.
          </div>
        )}

        {isMt5 && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.12)',
              color: '#111827',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Important: Do not share your MT5 password with anyone and do not change it. Changing the password can lead to account breach or loss of access.
          </div>
        )}
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default CredentialsPage