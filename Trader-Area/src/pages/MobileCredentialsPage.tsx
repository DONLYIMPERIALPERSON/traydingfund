import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import { fetchUserChallengeAccountDetail, type UserChallengeAccountDetailResponse } from '../lib/traderAuth'
import '../styles/MobileCredentialsPage.css'

const MobileCredentialsPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [accountData, setAccountData] = useState<UserChallengeAccountDetailResponse | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const challengeId = searchParams.get('challenge_id')

  const loadAccountDetails = () => {
    if (!challengeId) {
      setError('Challenge ID is required')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    fetchUserChallengeAccountDetail(challengeId)
      .then((data) => setAccountData(data))
      .catch(() => setError('service_unavailable'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAccountDetails()
  }, [challengeId])

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch (copyError) {
      console.error('Failed to copy credential', copyError)
    }
  }

  if (loading) {
    return (
      <div className="mobile-credentials-page">
        <div className="mobile-credentials-loading">Loading account details...</div>
      </div>
    )
  }

  if (error || !accountData) {
    return (
      <div className="mobile-credentials-page">
        <div className="mobile-credentials-shell">
          {error === 'service_unavailable'
            ? <ServiceUnavailableState onRetry={loadAccountDetails} />
            : <div className="mobile-credentials-error">{error || 'Account not found'}</div>}
        </div>
      </div>
    )
  }

  const normalizedPlatform = String(accountData.platform ?? '').toLowerCase()
  const serverHint = accountData.credentials?.server?.toLowerCase().includes('mt5')
  const resolvedPlatform = normalizedPlatform || (serverHint ? 'mt5' : 'ctrader')
  const isMt5 = resolvedPlatform === 'mt5'
  const platformLabel = isMt5 ? 'MT5 PLATFORM' : 'CTRADER PLATFORM'

  return (
    <div className="mobile-credentials-page">
      <div className="mobile-credentials-shell">
        <header className="mobile-credentials-header">
          <button type="button" className="mobile-credentials-back" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-credentials-header__text">
            <h1>Credentials</h1>
            <p>Secure trading account access</p>
          </div>

          <button type="button" className="mobile-credentials-support" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        <section className="mobile-credentials-platform-card">
          <div>
            <span className="mobile-credentials-platform-card__label">Platform</span>
            <strong>{platformLabel}</strong>
          </div>
          <span className="mobile-credentials-encrypted-badge">
            <i className="fas fa-shield" />
            Encrypted
          </span>
        </section>

        <section className="mobile-credentials-list">
          <article className="mobile-credentials-card">
            <div className="mobile-credentials-card__main">
              <div className="mobile-credentials-card__icon"><i className="fas fa-building" /></div>
              <div className="mobile-credentials-card__text">
                <span>Broker</span>
                <strong>{accountData.credentials?.server || 'N/A'}</strong>
              </div>
            </div>
            <button type="button" className="mobile-credentials-copy" onClick={() => void handleCopy(accountData.credentials?.server || '')}>
              <i className="fas fa-copy" />
            </button>
          </article>

          <article className="mobile-credentials-card">
            <div className="mobile-credentials-card__main">
              <div className="mobile-credentials-card__icon"><i className="fas fa-hashtag" /></div>
              <div className="mobile-credentials-card__text">
                <span>Account</span>
                <strong>{accountData.credentials?.account_number || 'N/A'}</strong>
              </div>
            </div>
            <button type="button" className="mobile-credentials-copy" onClick={() => void handleCopy(accountData.credentials?.account_number || '')}>
              <i className="fas fa-copy" />
            </button>
          </article>

          {isMt5 && accountData.credentials?.password ? (
            <article className="mobile-credentials-card mobile-credentials-card--password">
              <div className="mobile-credentials-card__main">
                <div className="mobile-credentials-card__icon"><i className="fas fa-key" /></div>
                <div className="mobile-credentials-card__text">
                  <span>Password</span>
                  <strong>{showPassword ? accountData.credentials.password : '••••••••'}</strong>
                </div>
              </div>
              <div className="mobile-credentials-card__actions">
                <button type="button" className="mobile-credentials-mini-action" onClick={() => setShowPassword((prev) => !prev)}>
                  <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`} />
                  {showPassword ? 'Hide' : 'Show'}
                </button>
                <button type="button" className="mobile-credentials-mini-action" onClick={() => void handleCopy(accountData.credentials?.password || '')}>
                  <i className="fas fa-copy" />
                  Copy
                </button>
              </div>
            </article>
          ) : null}
        </section>

        {!isMt5 ? (
          <div className="mobile-credentials-note mobile-credentials-note--warning">
            This account has been linked to your email. Kindly login to cTrader to view or trade.
          </div>
        ) : null}

        {isMt5 ? (
          <div className="mobile-credentials-note mobile-credentials-note--danger">
            Important: Do not share your MT5 password with anyone and do not change it. Changing the password can lead to account breach or loss of access.
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default MobileCredentialsPage