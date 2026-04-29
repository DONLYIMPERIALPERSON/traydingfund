import React, { useEffect, useRef, useState } from 'react'
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

type RewardView = 'request' | 'history'

const resolveEffectiveKycStatus = (profileStatusRaw: string | null | undefined, hasHistory: boolean, latestRequestStatus?: string) => {
  const profileStatus = (profileStatusRaw || 'not_started').toLowerCase()
  if (hasHistory) return latestRequestStatus || profileStatus
  return profileStatus === 'pending' ? 'not_started' : profileStatus
}

const MobileRewardPage: React.FC = () => {
  const [activeView, setActiveView] = useState<RewardView>('request')
  const [requestingPayout, setRequestingPayout] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [payoutData, setPayoutData] = useState<PayoutSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestingAccountId, setRequestingAccountId] = useState<number | null>(null)
  const [bankProfile, setBankProfile] = useState<BankAccountProfile | null>(null)
  const [cryptoProfile, setCryptoProfile] = useState<CryptoPayoutProfile | null>(null)
  const [kycStatus, setKycStatus] = useState('not_started')
  const [overallCertificate, setOverallCertificate] = useState<OverallRewardCertificate | null>(null)
  const [certificateVersion, setCertificateVersion] = useState(Date.now())
  const [refreshingCertificate, setRefreshingCertificate] = useState(false)
  const [certificateError, setCertificateError] = useState('')
  const [activeAccountIndex, setActiveAccountIndex] = useState(0)

  const navigate = useNavigate()
  const accountSliderRef = useRef<HTMLDivElement | null>(null)

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
      setKycStatus(resolveEffectiveKycStatus(
        profileRes.kyc_status,
        historyItems.length > 0,
        latestRequestStatus,
      ))
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

  useEffect(() => {
    const slider = accountSliderRef.current
    if (!slider || fundedAccounts.length === 0) return

    const handleScroll = () => {
      const firstSlide = slider.querySelector<HTMLElement>('.mobile-reward-account-slide')
      if (!firstSlide) return
      const slideWidth = firstSlide.getBoundingClientRect().width + 12
      if (!slideWidth) return
      const nextIndex = Math.round(slider.scrollLeft / slideWidth)
      setActiveAccountIndex(Math.min(Math.max(nextIndex, 0), fundedAccounts.length - 1))
    }

    slider.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => slider.removeEventListener('scroll', handleScroll)
  }, [fundedAccounts.length, activeView])

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
  const fundedAccounts = payoutData?.funded_accounts ?? []
  const overallRewardAmount = overallCertificate?.total_reward ?? payoutData?.total_earned_all_time ?? 0
  const overallRewardCurrency = overallCertificate?.currency ?? 'USD'

  const formatEligibleDate = (dateString?: string | null) => {
    if (!dateString) return 'Eligible today'
    const target = new Date(dateString)
    if (Number.isNaN(target.getTime())) return 'Eligible today'
    const diffMs = target.getTime() - Date.now()
    if (diffMs <= 0) return `Eligible today at ${formatTime(target.toISOString())}`

    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays <= 1
      ? `Eligible today at ${formatTime(target.toISOString())}`
      : `Eligible in ${diffDays} days`
  }

  const getAccountCardState = (account: PayoutSummaryResponse['funded_accounts'][number]) => {
    const meetsMinimum = account.available_payout >= account.minimum_withdrawal_amount
    const nextEligiblePending = Boolean(account.next_withdrawal_at && new Date(account.next_withdrawal_at).getTime() > Date.now())
    const breezyBlocked = account.withdrawal_eligible === false
    const hasPendingRequest = Boolean(account.has_pending_request)
    const isEligible = hasPayoutMethod
      && isKycVerified
      && meetsMinimum
      && !nextEligiblePending
      && !hasPendingRequest
      && !breezyBlocked

    let reason = ''
    if (!hasPayoutMethod) reason = 'Set a payout method in Settings first.'
    else if (!isKycVerified) reason = 'Complete KYC to unlock withdrawals.'
    else if (hasPendingRequest) reason = 'A withdrawal request is already pending for this account.'
    else if (breezyBlocked) reason = account.withdrawal_block_reason || 'This account is not currently eligible for withdrawal.'
    else if (nextEligiblePending) reason = formatEligibleDate(account.next_withdrawal_at)
    else if (!meetsMinimum) reason = `Minimum withdrawal is ${formatCurrency(account.minimum_withdrawal_amount, account.currency)}.`

    return { isEligible, reason }
  }

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

  const handleRequestPayout = async (accountId: number) => {
    try {
      setRequestingAccountId(accountId)
      setRequestingPayout(true)
      setRequestError('')
      const response = await payoutAPI.requestPayout(accountId)
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
      setRequestingAccountId(null)
    }
  }

  const scrollToAccountIndex = (index: number) => {
    const slider = accountSliderRef.current
    const firstSlide = slider?.querySelector<HTMLElement>('.mobile-reward-account-slide')
    if (!slider || !firstSlide) return
    const slideWidth = firstSlide.getBoundingClientRect().width + 12
    slider.scrollTo({ left: slideWidth * index, behavior: 'smooth' })
    setActiveAccountIndex(index)
  }

  return (
    <div className="mobile-reward-page">
      <div className="mobile-reward-shell">
        <header className="mobile-reward-header">
          <button type="button" className="mobile-reward-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-reward-header__text">
            <h1>Request A Reward</h1>
          </div>
          <button
            type="button"
            className={`mobile-reward-header__icon mobile-reward-header__icon--history ${activeView === 'history' ? 'is-active' : ''}`}
            onClick={() => setActiveView((current) => current === 'history' ? 'request' : 'history')}
          >
            <i className="fas fa-clock-rotate-left" />
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
                    <strong>{formatCurrency(overallRewardAmount, overallRewardCurrency)}</strong>
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
              <div className="mobile-reward-section-heading">
                <div>
                  <h2>{activeView === 'history' ? 'Withdrawal History' : 'Withdrawable Accounts'}</h2>
                </div>
                <span className="mobile-reward-section-badge">
                  {activeView === 'history' ? `${payoutData?.withdrawal_history.length ?? 0} items` : `${fundedAccounts.length} accounts`}
                </span>
              </div>

              {activeView === 'request' ? (
                !hasPayoutMethod ? (
                  <div className="mobile-reward-inline-note">
                    <p>Please add your bank transfer or crypto wallet in Settings before requesting a withdrawal.</p>
                    <button type="button" onClick={() => navigate('/settings')}>Go to Settings</button>
                  </div>
                ) : (
                  <>
                  <div ref={accountSliderRef} className="mobile-reward-account-list">
                    {fundedAccounts.map((account) => {
                      const state = getAccountCardState(account)
                      const isRequestingThis = requestingAccountId === account.account_id

                      return (
                        <div key={account.account_id} className="mobile-reward-account-slide">
                        <article
                          className={`mobile-reward-account-card ${state.isEligible ? 'is-eligible' : 'is-disabled'}`}
                        >
                          <div className="mobile-reward-account-card__top">
                            <div>
                              <span className="mobile-reward-account-card__eyebrow">Account Number</span>
                              <strong>{account.mt5_account_number || account.challenge_id}</strong>
                            </div>
                            <span className={`mobile-reward-account-card__status ${state.isEligible ? 'is-eligible' : 'is-disabled'}`}>
                              {state.isEligible ? 'Eligible' : 'Unavailable'}
                            </span>
                          </div>

                          <div className="mobile-reward-account-card__timeline">
                            <i className="fas fa-calendar-check" />
                            <span>{formatEligibleDate(account.next_withdrawal_at)}</span>
                          </div>

                          <div className="mobile-reward-account-card__grid">
                            <div>
                              <span>Balance</span>
                              <strong>{formatCurrency(account.current_balance, account.currency)}</strong>
                            </div>
                            <div>
                              <span>Profit split amount</span>
                              <strong>{formatCurrency(account.available_payout, account.currency)}</strong>
                            </div>
                            <div>
                              <span>Profit split %</span>
                              <strong>{account.profit_split_percent}%</strong>
                            </div>
                          </div>

                          {state.reason ? <p className="mobile-reward-account-card__reason">{state.reason}</p> : null}

                          {state.isEligible ? (
                            <div className="mobile-reward-account-card__actions">
                              <button
                                type="button"
                                className="mobile-reward-account-card__button"
                                onClick={() => void handleRequestPayout(account.account_id)}
                                disabled={requestingPayout}
                              >
                                {isRequestingThis ? 'Requesting...' : 'Request'}
                              </button>
                            </div>
                          ) : null}
                        </article>
                        </div>
                      )
                    })}
                  </div>
                  {fundedAccounts.length > 1 ? (
                    <div className="mobile-reward-slider-controls">
                      <button
                        type="button"
                        className="mobile-reward-slider-arrow"
                        onClick={() => scrollToAccountIndex(Math.max(activeAccountIndex - 1, 0))}
                        disabled={activeAccountIndex === 0}
                        aria-label="Previous account"
                      >
                        <i className="fas fa-chevron-left" />
                      </button>
                      <div className="mobile-reward-dots">
                        {fundedAccounts.map((account, index) => (
                          <button
                            key={account.account_id}
                            type="button"
                            className={index === activeAccountIndex ? 'is-active' : ''}
                            onClick={() => scrollToAccountIndex(index)}
                            aria-label={`Go to withdrawal account ${index + 1}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        className="mobile-reward-slider-arrow"
                        onClick={() => scrollToAccountIndex(Math.min(activeAccountIndex + 1, fundedAccounts.length - 1))}
                        disabled={activeAccountIndex === fundedAccounts.length - 1}
                        aria-label="Next account"
                      >
                        <i className="fas fa-chevron-right" />
                      </button>
                    </div>
                  ) : null}
                  </>
                )
              ) : payoutData?.withdrawal_history.length === 0 ? (
                <div className="mobile-reward-inline-note">No withdrawal history yet.</div>
              ) : (
                <div className="mobile-reward-history-list">
                  {payoutData.withdrawal_history.map((withdrawal) => (
                    <article key={withdrawal.id} className="mobile-reward-history-item">
                      <div className="mobile-reward-history-item__body">
                        <div className="mobile-reward-history-item__top">
                          <strong>{formatCurrency(withdrawal.amount, withdrawal.currency ?? 'USD')}</strong>
                          <span className={`mobile-reward-history-status ${withdrawal.status}`}>{resolveStatusLabel(withdrawal.status)}</span>
                        </div>
                        <p>{formatDate(withdrawal.requested_at)} • {formatTime(withdrawal.requested_at)}</p>
                        {withdrawal.mt5_account_number ? <small>Account: {withdrawal.mt5_account_number}</small> : null}
                        {withdrawal.reference ? <small>Ref: {withdrawal.reference}</small> : null}
                        {withdrawal.decline_reason ? <small>Reason: {withdrawal.decline_reason}</small> : null}
                      </div>
                      <div className="mobile-reward-history-item__right">
                        <small>{formatTimeAgo(withdrawal.completed_at || withdrawal.requested_at)}</small>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {requestError ? <div className="mobile-reward-error">{requestError}</div> : null}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default MobileRewardPage