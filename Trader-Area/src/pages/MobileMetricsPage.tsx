import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import {
  downloadBreachReport,
  fetchUserChallengeAccountDetail,
  refreshChallengeAccount,
  type UserChallengeAccountDetailResponse,
} from '../lib/traderAuth'
import '../styles/DesktopAccountOverviewPage.css'
import '../styles/MobileMetricsPage.css'

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

const isOlderThanThirtyMinutes = (timestamp?: string | null) => {
  if (!timestamp) return false
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return false
  return (Date.now() - parsed.getTime()) > (30 * 60 * 1000)
}

const MobileMetricsPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [accountData, setAccountData] = useState<UserChallengeAccountDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDownloadingBreachReport, setIsDownloadingBreachReport] = useState(false)

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

  const handleForceRefresh = useCallback(async () => {
    if (!challengeId || isRefreshing) return

    try {
      setIsRefreshing(true)
      const response = await refreshChallengeAccount(challengeId)
      setAccountData((current) => current ? {
        ...current,
        last_refresh_requested_at: response.requested_at ?? new Date().toISOString(),
      } : current)
      await loadAccountData()
    } catch (refreshError) {
      console.error('Failed to refresh account metrics', refreshError)
    } finally {
      setIsRefreshing(false)
    }
  }, [challengeId, isRefreshing, loadAccountData])

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
  const normalizedBreachReason = accountData.breached_reason?.toLowerCase() ?? ''
  const isFraudBreach = normalizedBreachReason.includes('fraud')
  const durationViolationsCount = (accountData.metrics.duration_violations_count ?? 0) > 0
    ? accountData.metrics.duration_violations_count ?? 0
    : (Array.isArray(accountData.metrics.trade_duration_violations) ? accountData.metrics.trade_duration_violations.length : 0)
  const minTradeDurationMinutes = (accountData.metrics as typeof accountData.metrics & { min_trade_duration_minutes?: number | null }).min_trade_duration_minutes ?? 0
  const initialBalance = accountData.initial_balance ?? parseAccountSize(accountData.account_size)
  const profitValue = accountData.metrics.balance - initialBalance
  const profitPercent = initialBalance > 0 ? (profitValue / initialBalance) * 100 : 0
  const latestUpdateTimestamp = accountData.last_feed_at ?? accountData.last_refresh_requested_at
  const showForceRefreshButton = isActiveAccount(accountData.objective_status) && isOlderThanThirtyMinutes(accountData.last_feed_at)

  return (
    <div className="mobile-metrics-page">
      <div className="mobile-metrics-shell">
        <header className="mobile-metrics-header">
          <button type="button" className="mobile-metrics-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-metrics-header__text">
            <h1>Metrics</h1>
            <p>{accountData.mt5_account ?? 'Pending'} · {accountData.phase}</p>
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

        <section className="mobile-metrics-balance-card">
          <div className="mobile-metrics-balance-header">
            <span className="mobile-metrics-balance-title">Balance Overview</span>
            <div className="mobile-metrics-update-row mobile-metrics-update-row--header">
              {showForceRefreshButton ? (
                <button type="button" className="mobile-metrics-refresh" onClick={() => void handleForceRefresh()}>
                  {isRefreshing ? 'Updating...' : 'Refresh'}
                </button>
              ) : (
                <span>Last updated: {formatRelativeUpdate(latestUpdateTimestamp)}</span>
              )}
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
              <span className={`mobile-metrics-profit-pill ${profitValue >= 0 ? 'is-positive' : 'is-negative'}`}>
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

        {!hasPendingWithdrawal && !isFraudBreach ? (
          <section className="mobile-metrics-objectives-card desktop-objectives-look">
            <div className="mobile-metrics-section-heading desktop-objectives-heading">
              <h2>Trading Objective</h2>
            </div>

            <div className="mobile-metrics-objectives-list desktop-objectives-list">
              {(
                ['profit_target', 'max_drawdown', 'max_daily_drawdown', 'min_trade_duration', 'min_trading_days'] as const
              )
                .filter((key) => !(accountData.challenge_type === 'ngn_flexi' && key === 'max_daily_drawdown'))
                .filter((key) => !(accountData.phase?.toLowerCase() === 'funded' && key === 'profit_target'))
                .map((key) => {
                  const objective = accountData.objectives[key] ?? {
                    label: {
                      profit_target: 'Profit Target',
                      max_drawdown: 'Max Drawdown',
                      max_daily_drawdown: 'Max Daily Drawdown',
                      min_trade_duration: 'Minimum Trade Duration',
                      min_trading_days: 'Minimum Trading Days',
                    }[key],
                    status: 'pending',
                    note: 'Pending',
                  }
                  const effectiveObjective = key === 'min_trade_duration'
                    ? {
                        ...objective,
                        status: durationViolationsCount >= 3 ? 'breached' : objective.status,
                        note: objective.note
                          ? objective.note.replace(/\(\d+\/3\)/, `(${durationViolationsCount}/3)`)
                          : `Pass • ${minTradeDurationMinutes} min rule (${durationViolationsCount}/3)`,
                      }
                    : objective

                  const iconMap: Record<string, { icon: string; className: string }> = {
                    max_drawdown: { icon: 'circle-exclamation', className: 'max-loss' },
                    max_daily_drawdown: { icon: 'triangle-exclamation', className: 'max-loss' },
                    profit_target: { icon: 'bullseye', className: 'profit-target' },
                    min_trade_duration: { icon: 'hourglass-half', className: 'time-rule' },
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
    </div>
  )
}

export default MobileMetricsPage