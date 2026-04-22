import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import '../styles/MobileRewardPage.css'
import {
  payoutAPI,
  formatCurrency,
  formatDate,
  formatTime,
  formatTimeAgo,
  type OverallRewardCertificate,
  type PayoutSummaryResponse,
} from '../lib/payoutApi'
import {
  fetchBankAccountProfile,
  fetchCryptoPayoutProfile,
  fetchProfile,
  fetchKycHistory,
  type BankAccountProfile,
  type CryptoPayoutProfile,
} from '../lib/traderAuth'

const MobileRewardPage: React.FC = () => {
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
  const [overallCertificate, setOverallCertificate] = useState<OverallRewardCertificate | null>(null)
  const [certificateVersion, setCertificateVersion] = useState(Date.now())
  const [refreshingCertificate, setRefreshingCertificate] = useState(false)
  const [certificateError, setCertificateError] = useState('')

  const navigate = useNavigate()

  const loadPayoutData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await payoutAPI.getPayoutSummary()
      setPayoutData(data)

      const [payoutProfile, cryptoPayoutProfile, profileRes, historyRes, overallReward] = await Promise.all([
        fetchBankAccountProfile(),
        fetchCryptoPayoutProfile(),
        fetchProfile(),
        fetchKycHistory(),
        payoutAPI.fetchOverallRewardCertificate(),
      ])
      setBankProfile(payoutProfile)
      setCryptoProfile(cryptoPayoutProfile)

      const historyItems = historyRes.requests ?? []
      const latestRequestStatus = historyItems[0]?.status?.toLowerCase()
      const profileStatus = (profileRes.kyc_status || 'not_started').toLowerCase()
      setKycStatus(historyItems.length > 0 ? (latestRequestStatus || profileStatus) : 'not_started')
      setOverallCertificate(overallReward)
      setCertificateVersion(Date.now())
    } catch {
      setError('service_unavailable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPayoutData()
  }, [])

  const normalizeStatus = (status: string) => status.replace(/_/g, ' ').toLowerCase()
  const resolveStatusLabel = (status: string) => {
    if (status === 'pending_approval') return 'Pending approval'
    if (status === 'processing') return 'Processing'
    if (status === 'failed' || status === 'declined') return 'Declined'
    if (status === 'completed') return 'Completed'
    return normalizeStatus(status)
  }

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

  const hasPayoutMethod = Boolean(bankProfile || cryptoProfile)
  const isKycVerified = ['verified', 'approved'].includes(kycStatus)
  const availableAccounts = payoutData ? payoutData.funded_accounts.filter((account) => !account.has_pending_request) : []

  const handleDownloadCertificate = () => {
    if (!overallCertificate?.certificate_url) return
    const link = document.createElement('a')
    link.href = overallCertificate.certificate_url
    link.download = 'overall-reward-certificate.png'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRefreshCertificate = async () => {
    try {
      setRefreshingCertificate(true)
      setCertificateError('')
      const updatedCertificate = await payoutAPI.fetchOverallRewardCertificate()
      setOverallCertificate(updatedCertificate)
      setCertificateVersion(Date.now())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh certificate.'
      setCertificateError(errorMessage)
    } finally {
      setRefreshingCertificate(false)
    }
  }

  const handleRequestPayout = async () => {
    if (!selectedAccountId) {
      setRequestError('Please select an account')
      return
    }

    try {
      setRequestingPayout(true)
      setRequestError('')
      const response = await payoutAPI.requestPayout(selectedAccountId)
      window.alert(response.message || 'Withdrawal request submitted successfully!')
      const data = await payoutAPI.getPayoutSummary()
      setPayoutData(data)
      const updatedCertificate = await payoutAPI.fetchOverallRewardCertificate()
      setOverallCertificate(updatedCertificate)
      setCertificateVersion(Date.now())
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setRequestError(errorMessage)
    } finally {
      setRequestingPayout(false)
    }
  }

  return (
    <div className="mobile-reward-page">
      <div className="mobile-reward-shell">
        <header className="mobile-reward-header">
          <button type="button" className="mobile-reward-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-reward-header__text">
            <h1>Rewards</h1>
            <p>Request and track your payouts.</p>
          </div>
          <button type="button" className="mobile-reward-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        {loading ? (
          <div className="mobile-reward-empty">Loading payout information...</div>
        ) : error ? (
          <ServiceUnavailableState onRetry={() => void loadPayoutData()} />
        ) : !isKycVerified ? (
          <section className="mobile-reward-card mobile-reward-card--locked">
            <h2>{kycLockedTitle}</h2>
            <p>{kycLockedMessage}</p>
            <button type="button" onClick={() => navigate('/kyc')}>Go to KYC</button>
          </section>
        ) : (
          <>
            {payoutData ? (
              <section className="mobile-reward-card mobile-reward-card--highlight">
                <div className="mobile-reward-highlight__top">
                  <div>
                    <span>Overall Reward</span>
                    <strong>{formatCurrency(payoutData.total_earned_all_time)}</strong>
                    <p>All-time earnings</p>
                  </div>
                  <button type="button" className="mobile-reward-refresh" onClick={() => void handleRefreshCertificate()} disabled={refreshingCertificate}>
                    <i className={`fas fa-sync-alt${refreshingCertificate ? ' fa-spin' : ''}`} />
                  </button>
                </div>

                {certificateError ? <div className="mobile-reward-error">{certificateError}</div> : null}

                {overallCertificate?.certificate_url ? (
                  <div className="mobile-reward-certificate" onClick={() => window.open(`${overallCertificate.certificate_url}?v=${certificateVersion}`, '_blank')}>
                    <img src={`${overallCertificate.certificate_url}?v=${certificateVersion}`} alt="Overall reward certificate" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleDownloadCertificate() }}>
                      <i className="fas fa-download" />
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="mobile-reward-card">
              <div className="mobile-reward-tabs">
                <button type="button" className={activeTab === 'request' ? 'is-active' : ''} onClick={() => setActiveTab('request')}>Request</button>
                <button type="button" className={activeTab === 'history' ? 'is-active' : ''} onClick={() => setActiveTab('history')}>History</button>
              </div>

              {activeTab === 'request' && payoutData ? (
                !hasPayoutMethod ? (
                  <div className="mobile-reward-inline-note">
                    <p>Please add your bank transfer or crypto wallet in Settings before requesting a withdrawal.</p>
                    <button type="button" onClick={() => navigate('/settings')}>Go to Settings</button>
                  </div>
                ) : (
                  <div className="mobile-reward-request-box">
                    <label>
                      <span>Select Account</span>
                      <select value={selectedAccountId || ''} onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : null)}>
                        <option value="" disabled>Select an account to withdraw from</option>
                        {availableAccounts.map((account) => {
                          const canWithdraw = account.available_payout >= account.minimum_withdrawal_amount
                          return (
                            <option key={account.account_id} value={account.account_id} disabled={!canWithdraw}>
                              {account.account_size} - Available: {formatCurrency(account.available_payout)}
                              {!canWithdraw ? ` (Min: ${formatCurrency(account.minimum_withdrawal_amount)})` : ''}
                            </option>
                          )
                        })}
                      </select>
                    </label>

                    <button type="button" onClick={() => void handleRequestPayout()} disabled={!payoutData.eligibility.is_eligible || requestingPayout}>
                      {requestingPayout ? 'Submitting...' : payoutData.eligibility.is_eligible ? 'Request Withdrawal' : 'Not Eligible'}
                    </button>

                    {requestError ? <div className="mobile-reward-error">{requestError}</div> : null}

                    {!payoutData.eligibility.is_eligible && payoutData.eligibility.ineligibility_reasons.length > 0 ? (
                      <div className="mobile-reward-reasons">
                        {payoutData.eligibility.ineligibility_reasons.map((reason, index) => (
                          <div key={index}>• {reason}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              ) : null}

              {activeTab === 'history' && payoutData ? (
                payoutData.withdrawal_history.length === 0 ? (
                  <div className="mobile-reward-inline-note">No withdrawal history yet.</div>
                ) : (
                  <div className="mobile-reward-history-list">
                    {payoutData.withdrawal_history.map((withdrawal) => (
                      <article key={withdrawal.id} className="mobile-reward-history-item">
                        <div>
                          <strong>{formatCurrency(withdrawal.amount)}</strong>
                          <p>{formatDate(withdrawal.requested_at)} • {formatTime(withdrawal.requested_at)}</p>
                          {withdrawal.reference ? <small>Ref: {withdrawal.reference}</small> : null}
                          {withdrawal.decline_reason ? <small>Reason: {withdrawal.decline_reason}</small> : null}
                        </div>
                        <div className="mobile-reward-history-item__right">
                          <span className={`mobile-reward-history-status ${withdrawal.status}`}>{resolveStatusLabel(withdrawal.status)}</span>
                          <small>{formatTimeAgo(withdrawal.completed_at || withdrawal.requested_at)}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                )
              ) : null}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default MobileRewardPage