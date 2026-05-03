import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MobilePaymentSheet from '../components/MobilePaymentSheet'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import {
  createBreezyRenewalOrder,
  createPhase2RepeatOrder,
  downloadBreachReport,
  fetchUserChallengeAccountDetail,
  refreshPaymentOrderStatus,
  type PaymentOrderResponse,
  type UserChallengeAccountDetailResponse,
} from '../lib/traderAuth'
import '../styles/DesktopAccountOverviewPage.css'
import '../styles/MobileMetricsPage.css'

const getBreezyProgressTone = (score: number) => {
  if (score >= 75) return 'good'
  if (score >= 50) return 'mid'
  return 'low'
}

const formatCurrency = (value: number, currencyCode: string) => {
  const normalized = currencyCode.toUpperCase()
  if (normalized === 'NGN') {
    return `₦${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalized,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatSignedCurrency = (value: number, currencyCode: string) => {
  const formatted = formatCurrency(Math.abs(value), currencyCode)
  return `${value >= 0 ? '+' : '-'}${formatted}`
}

const formatRelativeUpdate = (timestamp?: string | null) => {
  if (!timestamp) return 'Unknown'
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return 'Unknown'
  const diffMs = Date.now() - parsed.getTime()
  if (diffMs < 0) return 'Just now'
  const diffSeconds = Math.floor(diffMs / 1000)
  if (diffSeconds < 30) return 'Just now'
  if (diffSeconds < 60) return `${diffSeconds}s ago`
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

const formatCycleDate = (value?: string | null) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

const formatRenewalDate = (value?: string | null) => {
  if (!value) return 'Renewal date pending'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Renewal date pending'
  return `Renews ${parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
}

const parseAccountSize = (value: string) => {
  const normalized = value
    .toLowerCase()
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .replace(/k$/, '000')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const isActiveAccount = (status?: string | null) => {
  const normalized = String(status ?? '').toLowerCase()
  return normalized === 'active'
    || normalized === 'assigned'
    || normalized === 'funded'
    || normalized === 'assigned_pending_access'
    || normalized === 'admin_checking'
}

const MobileMetricsPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [accountData, setAccountData] = useState<UserChallengeAccountDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDownloadingBreachReport, setIsDownloadingBreachReport] = useState(false)
  const [isRenewing, setIsRenewing] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<PaymentOrderResponse | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [modalStatus, setModalStatus] = useState<'waiting' | 'confirming' | 'success'>('waiting')
  const [paymentStatus, setPaymentStatus] = useState('')

  const challengeId = searchParams.get('challenge_id')

  const loadAccountData = useCallback(async () => {
    if (!challengeId) return

    try {
      const data = await fetchUserChallengeAccountDetail(challengeId)
      setAccountData(data)
      setError('')
    } catch {
      setError('service_unavailable')
    }
  }, [challengeId])

  useEffect(() => {
    if (!challengeId) {
      setError('Challenge ID is required')
      setLoading(false)
      return
    }

    loadAccountData().finally(() => setLoading(false))
  }, [challengeId, loadAccountData])

  const handleDownloadBreachReport = useCallback(async () => {
    if (isDownloadingBreachReport || !challengeId) return

    try {
      setIsDownloadingBreachReport(true)
      const resolvedUrl = accountData?.breach_report_url
        ?? (await downloadBreachReport(challengeId)).download_url

      if (!resolvedUrl) {
        throw new Error('Breach report is not available yet. Please try again in a moment.')
      }

      const link = document.createElement('a')
      link.href = resolvedUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (downloadError) {
      console.error('Failed to download breach report', downloadError)
      window.alert(downloadError instanceof Error ? downloadError.message : 'Failed to download breach report')
    } finally {
      setIsDownloadingBreachReport(false)
    }
  }, [accountData?.breach_report_url, challengeId, isDownloadingBreachReport])

  const startPaymentPolling = useCallback(async (orderId: string) => {
    setModalStatus('confirming')
    for (let i = 0; i < 24; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      try {
        const refreshed = await refreshPaymentOrderStatus(orderId)
        if (refreshed.status === 'completed') {
          setModalStatus('success')
          if (currentOrder?.order_type !== 'phase2_repeat') {
            await loadAccountData()
          }
          return
        }
        if (refreshed.status === 'failed' || refreshed.status === 'expired') {
          setModalStatus('waiting')
          setPaymentStatus(`Payment ${refreshed.status}. Please try again.`)
          setShowPaymentModal(false)
          return
        }
      } catch (error) {
        console.error('Renewal payment status check failed:', error)
      }
    }
    setModalStatus('waiting')
    setPaymentStatus('Payment confirmation timed out. Please check your payment status.')
    setShowPaymentModal(false)
  }, [currentOrder?.order_type, loadAccountData])

  const handleBreezyRenew = useCallback(async () => {
    if (isRenewing) return
    try {
      setIsRenewing(true)
      const accountId = Number((accountData as unknown as { account_id?: number }).account_id)
      if (!Number.isFinite(accountId) || accountId <= 0) {
        throw new Error('Unable to resolve Breezy account for renewal.')
      }
      const order = await createBreezyRenewalOrder(accountId)
      setCurrentOrder(order)
      setShowPaymentModal(true)
      void startPaymentPolling(order.provider_order_id)
    } catch (error) {
      setPaymentStatus(error instanceof Error ? error.message : 'Failed to create renewal payment')
    } finally {
      setIsRenewing(false)
    }
  }, [accountData, isRenewing, startPaymentPolling])

  const handlePhase2Repeat = useCallback(async () => {
    if (isRenewing) return
    try {
      setIsRenewing(true)
      setPaymentStatus('')
      const accountId = Number((accountData as unknown as { account_id?: number }).account_id)
      if (!Number.isFinite(accountId) || accountId <= 0) {
        throw new Error('Unable to resolve breached account for repeat.')
      }
      const order = await createPhase2RepeatOrder(accountId)
      setCurrentOrder(order)
      setShowPaymentModal(true)
      void startPaymentPolling(order.provider_order_id)
    } catch (error) {
      setPaymentStatus(error instanceof Error ? error.message : 'Failed to create repeat payment')
    } finally {
      setIsRenewing(false)
    }
  }, [accountData, isRenewing, startPaymentPolling])

  const accountCurrency = (accountData?.currency || 'USD').toUpperCase()

  if (loading) {
    return (
      <div className="mobile-metrics-page">
        <div className="mobile-metrics-loading">Loading account metrics...</div>
      </div>
    )
  }

  if (error || !accountData) {
    return (
      <div className="mobile-metrics-page">
        <div className="mobile-metrics-shell">
          {error === 'service_unavailable'
            ? <ServiceUnavailableState onRetry={() => void loadAccountData()} />
            : <div className="mobile-metrics-error">{error || 'Account not found'}</div>}
        </div>
      </div>
    )
  }

  const hasPendingWithdrawal = Boolean(accountData.has_pending_withdrawal)
  const isBreezyAccount = String(accountData.challenge_type ?? '').toLowerCase() === 'breezy'
  const normalizedBreachReason = accountData.breached_reason?.toLowerCase() ?? ''
  const isFraudBreach = normalizedBreachReason.includes('fraud')
  const initialBalance = accountData.initial_balance ?? parseAccountSize(accountData.account_size)
  const profitValue = accountData.metrics.balance - initialBalance
  const profitPercent = initialBalance > 0 ? (profitValue / initialBalance) * 100 : 0
  const latestUpdateTimestamp = accountData.last_feed_at ?? accountData.last_refresh_requested_at
  const showLastUpdated = isActiveAccount(accountData.objective_status)
  const breezyMetrics = accountData.metrics.breezy
  const breezyScore = Math.max(0, Math.min(100, Number(breezyMetrics?.risk_score ?? accountData.breezy?.risk_score ?? 0)))
  const breezyBand = String(breezyMetrics?.risk_score_band ?? accountData.breezy?.risk_score_band ?? 'N/A').toUpperCase()
  const breezyTradeCount = Number(accountData.metrics.closed_trades_count ?? 0)
  const breezyTradesNeeded = Math.max(0, 5 - breezyTradeCount)
  const breezyProfitSplit = Number(breezyMetrics?.effective_profit_split_percent ?? accountData.breezy?.profit_split_percent ?? 0)
  const breezyWithdrawalEligible = Boolean(breezyMetrics?.withdrawal_eligible ?? accountData.breezy?.withdrawal_eligible)
  const breezyWithdrawalBlockReason = breezyMetrics?.withdrawal_block_reason ?? accountData.breezy?.withdrawal_block_reason ?? null
  const breezyTone = getBreezyProgressTone(breezyScore)
  const breezyCanRenew = Boolean(accountData.breezy?.can_renew)
  const breezyExpiresAt = accountData.breezy?.subscription_expires_at
  const breezyRenewalAmount = typeof accountData.breezy?.renewal_price_kobo === 'number'
    ? accountData.breezy.renewal_price_kobo / 100
    : null
  const phase2RepeatEligible = Boolean(accountData.phase2_repeat?.eligible)
  const phase2RepeatFee = typeof accountData.phase2_repeat?.repeat_fee_kobo === 'number'
    ? accountData.phase2_repeat.repeat_fee_kobo / 100
    : null

  return (
    <div className="mobile-metrics-page">
      <div className="mobile-metrics-shell">
        <header className="mobile-metrics-header">
          <button type="button" className="mobile-metrics-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-metrics-header__text">
            <h1>Metrics</h1>
            <p>
              {accountData.mt5_account ?? 'Pending'} · {String(accountData.challenge_type ?? '').toLowerCase() === 'breezy'
                ? formatRenewalDate(accountData.breezy?.subscription_expires_at)
                : accountData.phase}
            </p>
          </div>
          <button type="button" className="mobile-metrics-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        {accountData.objective_status === 'breached' ? (
          <section className="mobile-metrics-breach-card">
            <div>
              <strong>Account breached</strong>
              <p>Download your breach report for full details.</p>
            </div>
            <button type="button" onClick={() => void handleDownloadBreachReport()}>
              {isDownloadingBreachReport ? 'Preparing...' : 'Download'}
            </button>
          </section>
        ) : null}

        {phase2RepeatEligible ? (
          <section className="mobile-metrics-breach-card">
            <div>
              <strong>Phase 2 Repeat</strong>
              <p>
                Get a new Phase 2 account for this breached challenge.
                {phase2RepeatFee != null ? ` Fee: ${formatCurrency(phase2RepeatFee, accountCurrency)}.` : ''}
              </p>
            </div>
            <button type="button" onClick={() => void handlePhase2Repeat()}>
              {isRenewing ? 'Preparing...' : 'Repeat Now'}
            </button>
          </section>
        ) : null}

        {paymentStatus ? <div className="mobile-metrics-error" style={{ marginBottom: 12 }}>{paymentStatus}</div> : null}

        {hasPendingWithdrawal ? (
          <section className="mobile-metrics-breach-card">
            <div>
              <strong>Withdrawal Under Review</strong>
              <p>
                Your withdrawal request for <strong>{formatCurrency(accountData.pending_withdrawal_amount ?? 0, accountCurrency)}</strong> is being reviewed.
                <strong> Warning:</strong> do not trade on this account until the review is complete to avoid a breach.
              </p>
            </div>
          </section>
        ) : null}

        <section className="mobile-metrics-balance-card">
          <div className="mobile-metrics-balance-header">
            <span className="mobile-metrics-balance-title">Balance Overview</span>
            <div className="mobile-metrics-update-row mobile-metrics-update-row--header">
              {showLastUpdated ? (
                <span>Last updated: {formatRelativeUpdate(latestUpdateTimestamp)}</span>
              ) : null}
            </div>
          </div>

          <div className="mobile-metrics-balance-grid desktop-inspired">
            <div className="mobile-metrics-balance-box">
              <div className="mobile-metrics-balance-box__header">
                <i className="fas fa-wallet" />
                Balance
              </div>
              <div className="mobile-metrics-balance-box__value">
                {formatCurrency(accountData.metrics.balance, accountCurrency)}
              </div>
            </div>

            <div className="mobile-metrics-balance-box mobile-metrics-balance-box--profit-loss">
              <span className={`mobile-metrics-profit-outline-tag ${profitValue >= 0 ? 'is-positive' : 'is-negative'}`}>
                {profitValue >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
              </span>
              <div className="mobile-metrics-balance-box__header">
                <i className="fas fa-chart-line" />
                Profit/Loss
              </div>
              <div className={`mobile-metrics-balance-box__value ${profitValue >= 0 ? 'is-positive' : 'is-negative'}`}>
                {formatSignedCurrency(profitValue, accountCurrency)}
              </div>
            </div>

            <div className="mobile-metrics-balance-box">
              <div className="mobile-metrics-balance-box__header">
                <i className="fas fa-chart-simple" />
                Unrealized PnL
              </div>
              <div className={`mobile-metrics-balance-box__value ${accountData.metrics.unrealized_pnl >= 0 ? 'is-positive' : 'is-negative'}`}>
                {formatSignedCurrency(accountData.metrics.unrealized_pnl, accountCurrency)}
              </div>
            </div>

            <div className="mobile-metrics-balance-box mobile-metrics-balance-box--trading-days">
              <div className="mobile-metrics-balance-box__header">
                Trading Days
                <i className="fas fa-info-circle" />
              </div>
              <div className="mobile-metrics-balance-box__value">
                {accountData.metrics.trading_days_count ?? 0}
              </div>
              <div className="mobile-metrics-balance-box__subtext">
                <span className="mobile-metrics-balance-box__subtitle">Trading Cycle</span>
                <span>Start Date: {formatCycleDate(accountData.metrics.trading_cycle_start)}</span>
                <span>End Date: Unlimited</span>
              </div>
            </div>
          </div>

        </section>

        {!hasPendingWithdrawal && !isFraudBreach && !isBreezyAccount ? (
          <section className="mobile-metrics-objectives-card desktop-objectives-look">
            <div className="mobile-metrics-section-heading desktop-objectives-heading">
              <h2>Trading Objective</h2>
            </div>

            <div className="mobile-metrics-objectives-list desktop-objectives-list">
              {(
                ['profit_target', 'max_drawdown', 'max_daily_drawdown', 'min_trading_days'] as const
              )
                .filter((key) => !(accountData.challenge_type === 'ngn_flexi' && key === 'max_daily_drawdown'))
                .filter((key) => !(accountData.phase?.toLowerCase() === 'funded' && key === 'profit_target'))
                .map((key) => {
                  const objective = accountData.objectives[key] ?? {
                    label: {
                      profit_target: 'Profit Target',
                      max_drawdown: 'Max Drawdown',
                      max_daily_drawdown: 'Max Daily Drawdown',
                      min_trading_days: 'Minimum Trading Days',
                    }[key],
                    status: 'pending',
                    note: 'Pending',
                  }
                  const effectiveObjective = objective

                  const iconMap: Record<string, { icon: string; className: string }> = {
                    max_drawdown: { icon: 'circle-exclamation', className: 'max-loss' },
                    max_daily_drawdown: { icon: 'triangle-exclamation', className: 'max-loss' },
                    profit_target: { icon: 'bullseye', className: 'profit-target' },
                    min_trading_days: { icon: 'calendar-days', className: 'trading-days' },
                  }
                  const iconConfig = iconMap[key] ?? { icon: 'clipboard-list', className: 'trading-days' }

                  const targetBalance = (() => {
                    if (key === 'profit_target') return accountData.metrics.profit_target_balance
                    if (key === 'max_drawdown') return accountData.metrics.breach_balance
                    if (key === 'max_daily_drawdown') return accountData.metrics.daily_breach_balance
                    return null
                  })()

                  return (
                    <div key={key} className="objective-item desktop-objective-item">
                      <div className="objective-content desktop-objective-content">
                        <i className={`fas fa-${iconConfig.icon} objective-icon desktop-objective-icon ${iconConfig.className}`}></i>
                        <div className="objective-text-section desktop-objective-text-section">
                          <span className="objective-text desktop-objective-text">
                            {key === 'min_trading_days' ? 'Min Trading Days' : effectiveObjective.label}
                          </span>
                          {key === 'min_trading_days' ? (
                            <span className="objective-info desktop-objective-info">
                              {(() => {
                                if (effectiveObjective.note) {
                                  const match = effectiveObjective.note.match(/(\d+(?:\.\d+)?)h\s*\/\s*(\d+(?:\.\d+)?)h/)
                                  if (match) {
                                    const elapsedHours = parseFloat(match[1] || '0')
                                    const totalHours = parseFloat(match[2] || '0')
                                    const remainingHours = Math.max(0, totalHours - elapsedHours)
                                    if (remainingHours <= 0) return 'Complete'
                                    const hours = Math.floor(remainingHours)
                                    const minutes = Math.floor((remainingHours - hours) * 60)
                                    if (hours > 0 && minutes > 0) return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''} left`
                                    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`
                                    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} left`
                                    return 'Complete'
                                  }
                                }
                                return effectiveObjective.note || '00:00 Hours'
                              })()}
                            </span>
                          ) : (
                            <>
                              {key === 'profit_target' ? (() => {
                                const profitTargetAmount = accountData.metrics.profit_target_amount
                                const initialBalanceValue = accountData.initial_balance ?? parseAccountSize(accountData.account_size)
                                const target = profitTargetAmount != null
                                  ? profitTargetAmount
                                  : Math.max(0, (targetBalance ?? initialBalanceValue) - initialBalanceValue)
                                const current = Math.max(0, accountData.metrics.balance - initialBalanceValue)
                                const remaining = Math.max(0, target - current)
                                return (
                                  <div className="objective-metric-group">
                                    <span className="objective-info desktop-objective-info">Target: {formatCurrency(target, accountCurrency)}</span>
                                    <span className="objective-info desktop-objective-info">Current: {formatCurrency(current, accountCurrency)}</span>
                                    <span className="objective-info desktop-objective-info">Remaining: {formatCurrency(remaining, accountCurrency)}</span>
                                  </div>
                                )
                              })() : key === 'max_drawdown' ? (() => {
                                const maxLossLimit = accountData.metrics.max_dd_amount
                                  ?? ((accountData.metrics.highest_balance ?? 0) - (accountData.metrics.breach_balance ?? 0))
                                const maxLossTillNow = Math.max(0, (accountData.metrics.highest_balance ?? 0) - accountData.metrics.equity)
                                const maxPermittedLoss = Math.max(0, maxLossLimit - maxLossTillNow)
                                return (
                                  <div className="objective-metric-group">
                                    <span className="objective-info desktop-objective-info">Max Loss Limit: {formatCurrency(maxLossLimit, accountCurrency)}</span>
                                    <span className="objective-info desktop-objective-info">Max Loss till now: {formatCurrency(maxLossTillNow, accountCurrency)}</span>
                                    <span className="objective-info desktop-objective-info">Max Permitted Loss: {formatCurrency(maxPermittedLoss, accountCurrency)}</span>
                                  </div>
                                )
                              })() : key === 'max_daily_drawdown' ? (() => {
                                const maxDailyLimit = accountData.metrics.daily_dd_amount
                                  ?? ((accountData.metrics.daily_peak_balance ?? 0) - (accountData.metrics.daily_breach_balance ?? 0))
                                const dailyStartBalance = accountData.metrics.daily_peak_balance ?? accountData.metrics.balance
                                const dailyLossBase = accountData.metrics.equity ?? accountData.metrics.balance
                                const maxDailyLossTillNow = Math.max(0, dailyStartBalance - dailyLossBase)
                                const todayPermittedLoss = Math.max(0, maxDailyLimit - maxDailyLossTillNow)
                                return (
                                  <div className="objective-metric-group">
                                    <span className="objective-info desktop-objective-info">Max Daily Limit: {formatCurrency(maxDailyLimit, accountCurrency)}</span>
                                    <span className="objective-info desktop-objective-info">Max Loss till now: {formatCurrency(maxDailyLossTillNow, accountCurrency)}</span>
                                    <span className="objective-info desktop-objective-info">Today's Permitted Loss: {formatCurrency(todayPermittedLoss, accountCurrency)}</span>
                                  </div>
                                )
                              })() : (
                                <>
                                  {effectiveObjective.note && <span className="objective-info desktop-objective-info">{effectiveObjective.note}</span>}
                                  {targetBalance != null && (
                                    <span className="objective-subinfo desktop-objective-info">
                                      Target balance {formatCurrency(targetBalance, accountCurrency)}
                                    </span>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <i
                        className={`fas fa-${effectiveObjective.status === 'passed' ? 'check-circle' : effectiveObjective.status === 'breached' ? 'times-circle' : 'far fa-circle'} objective-status desktop-objective-status ${effectiveObjective.status === 'passed' ? 'completed' : effectiveObjective.status === 'breached' ? 'breached' : 'pending'}`}
                      ></i>
                    </div>
                  )
                })}
            </div>

            <div className="desktop-objective-progress-bar"></div>
          </section>
        ) : null}

        {!hasPendingWithdrawal && !isFraudBreach && isBreezyAccount ? (
          <section className="mobile-metrics-objectives-card mobile-breezy-card">
            <div className="mobile-metrics-section-heading">
              <h2>Breezy Metrics</h2>
            </div>

            <div className="mobile-breezy-grid">
              <div className="mobile-breezy-item mobile-breezy-item--hero">
                <span className="mobile-breezy-item__label">Risk Score</span>
                <strong className="mobile-breezy-item__value">{breezyScore}/100</strong>
                <span className={`mobile-breezy-item__status is-${breezyTone}`}>Status: {breezyBand}</span>
                <div className="mobile-breezy-progress">
                  <div className={`mobile-breezy-progress__bar is-${breezyTone}`} style={{ width: `${breezyScore}%` }} />
                </div>
              </div>

              <div className="mobile-breezy-item">
                <span className="mobile-breezy-item__label">Trade Stats</span>
                <strong className="mobile-breezy-item__value">{breezyTradeCount}/5</strong>
                <span className="mobile-breezy-item__copy">
                  Closed Trades{breezyTradesNeeded > 0 ? ` · ${breezyTradesNeeded} needed` : ' · Requirement met'}
                </span>
              </div>

              <div className="mobile-breezy-item">
                <span className="mobile-breezy-item__label">Profit Split</span>
                <strong className="mobile-breezy-item__value">{breezyProfitSplit}%</strong>
                <span className="mobile-breezy-item__copy">Dynamic based on risk score</span>
              </div>

              <div className="mobile-breezy-item">
                <span className="mobile-breezy-item__label">Withdrawal Status</span>
                <strong className={`mobile-breezy-item__value ${breezyWithdrawalEligible ? 'is-positive' : 'is-negative'}`}>
                  {breezyWithdrawalEligible ? 'Eligible' : 'Not Eligible'}
                </strong>
                <span className="mobile-breezy-item__copy">
                  {breezyWithdrawalEligible ? 'Breezy criteria satisfied' : (breezyWithdrawalBlockReason ?? 'Criteria not yet met')}
                </span>
              </div>

            </div>
          </section>
        ) : null}

        {!hasPendingWithdrawal && isFraudBreach ? (
          <section className="mobile-metrics-objectives-card mobile-metrics-objectives-card--fraud">
            <div className="mobile-metrics-section-heading">
              <h2>Account Breached</h2>
            </div>
            <div className="mobile-metrics-fraud-card">
              <div className="mobile-metrics-fraud-card__icon">
                <i className="fas fa-shield-alt" />
              </div>
              <div>
                <strong>Account Manipulation Detected</strong>
                <p>Your account has been breached for balance manipulation activity. Please contact support if this is unexpected.</p>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {showPaymentModal && currentOrder ? (
        <MobilePaymentSheet
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setCurrentOrder(null)
            setModalStatus('waiting')
          }}
          status={modalStatus}
          paymentDetails={{
            bankName: currentOrder.payer_bank_name || '',
            accountName: currentOrder.payer_account_name || '',
            accountNumber: currentOrder.payer_virtual_acc_no || '',
            amount: currentOrder.bank_transfer_amount_ngn
              ? `₦${currentOrder.bank_transfer_amount_ngn.toLocaleString('en-NG')}`
              : `$${(currentOrder.net_amount_kobo / 100).toLocaleString('en-US')}`,
          }}
        />
      ) : null}
    </div>
  )
}

export default MobileMetricsPage