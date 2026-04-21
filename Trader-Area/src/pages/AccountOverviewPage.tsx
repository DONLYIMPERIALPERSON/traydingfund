import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import { downloadBreachReport, fetchUserChallengeAccountDetail, refreshChallengeAccount, type UserChallengeAccountDetailResponse } from '../lib/traderAuth'
import '../styles/DesktopAccountOverviewPage.css'

const AccountOverviewPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [accountData, setAccountData] = useState<UserChallengeAccountDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showBreachModal, setShowBreachModal] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDownloadingBreachReport, setIsDownloadingBreachReport] = useState(false)

  const resolveCurrencyCode = (account: UserChallengeAccountDetailResponse) => {
    const currency = account.currency
    return currency ? currency.toUpperCase() : 'USD'
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
  const formatDateTime = (value?: string | number | null) => {
    if (value == null) return 'N/A'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return String(value)
    return parsed.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const isPlainObject = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
  )

  const renderDetailValue = (key: string, value: unknown): string => {
    if (value == null) return 'N/A'
    if ((key === 'time_ms' || key === 'closed_time_ms' || key.endsWith('_time_ms')) && typeof value === 'number') {
      return formatDateTime(value)
    }
    if ((key === 'duration_min' || key === 'minutes_after_breach' || key.endsWith('_duration_min')) && typeof value === 'number') {
      return value.toFixed(4)
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const renderDetailEntries = (data: Record<string, unknown>) => (
    <>
      {Object.entries(data).map(([key, value]) => {
        if (isPlainObject(value)) {
          return (
            <div key={key} style={{ marginTop: 8 }}>
              <strong>{key.replace(/_/g, ' ')}:</strong>
              <div style={{ marginLeft: 12, marginTop: 4 }}>
                {renderDetailEntries(value)}
              </div>
            </div>
          )
        }

        if (Array.isArray(value)) {
        const objectItems = value.filter(isPlainObject)
        if (objectItems.length === value.length) {
          return (
            <div key={key} style={{ marginTop: 8 }}>
              <strong>{key.replace(/_/g, ' ')}:</strong>
              <div style={{ marginLeft: 12, marginTop: 4, display: 'grid', gap: 8 }}>
                {objectItems.map((item, index) => (
                  <div key={`${key}-${index}`} style={{ paddingLeft: 8, borderLeft: '2px solid rgba(148, 163, 184, 0.35)' }}>
                    <div style={{ color: '#94a3b8', marginBottom: 4 }}>#{index + 1}</div>
                    {renderDetailEntries(item)}
                  </div>
                ))}
              </div>
            </div>
          )
        }

          return (
            <div key={key}>
            <strong>{key.replace(/_/g, ' ')}:</strong> {value.map((item) => renderDetailValue(key, item)).join(', ')}
            </div>
          )
        }

        return (
          <div key={key}>
            <strong>{key.replace(/_/g, ' ')}:</strong> {renderDetailValue(key, value)}
          </div>
        )
      })}
    </>
  )
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

  const challengeId = searchParams.get('challenge_id')

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

  const loadAccountData = useCallback(async () => {
    if (!challengeId) return

    try {
      const data = await fetchUserChallengeAccountDetail(challengeId)
      setAccountData(data)
      setError('')
    } catch (err: unknown) {
      setError('service_unavailable')
    }
  }, [challengeId])

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
    } catch (err) {
      console.error('Failed to refresh account metrics', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [challengeId, isRefreshing, loadAccountData])

  const handleDownloadBreachReport = useCallback(async () => {
    if (!challengeId || isDownloadingBreachReport) return
    try {
      setIsDownloadingBreachReport(true)
      const blob = await downloadBreachReport(challengeId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `breach-report-${accountData?.mt5_account ?? challengeId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download breach report', err)
      window.alert(err instanceof Error ? err.message : 'Failed to download breach report')
    } finally {
      setIsDownloadingBreachReport(false)
    }
  }, [accountData?.mt5_account, challengeId, isDownloadingBreachReport])

  useEffect(() => {
    if (!challengeId) {
      setError('Challenge ID is required')
      setLoading(false)
      return
    }

    loadAccountData().finally(() => setLoading(false))
    const refreshInterval = window.setInterval(() => {
      loadAccountData()
    }, 15000)

    return () => window.clearInterval(refreshInterval)
  }, [challengeId, loadAccountData])



  if (loading) {
    return (
      <div className="account-overview-page">
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
      <div className="account-overview-page">
        <DesktopHeader />
        <DesktopSidebar />
        <div style={{ padding: '96px 24px 24px', display: 'flex', justifyContent: 'center' }}>
          {error === 'service_unavailable'
            ? <ServiceUnavailableState onRetry={() => void loadAccountData()} />
            : <div style={{ color: '#ff8b8b' }}>{error || 'Account not found'}</div>}
        </div>
      </div>
    )
  }

  const hasPendingWithdrawal = Boolean(accountData.has_pending_withdrawal)
  const normalizedBreachReason = accountData.breached_reason?.toLowerCase() ?? ''
  const breachDetails = accountData.metrics.breach_event
  const tradeViolations = accountData.metrics.trade_duration_violations ?? []
  const breachEventTimestamp = (() => {
    if (!breachDetails || typeof breachDetails !== 'object') return accountData.breached_at ?? null
    const event = breachDetails as Record<string, unknown>
    const eventTimeMs = event.time_ms ?? event.closed_time_ms ?? event.timestamp_ms
    if (typeof eventTimeMs === 'number' && Number.isFinite(eventTimeMs)) {
      return eventTimeMs
    }
    if (typeof eventTimeMs === 'string') {
      const parsed = Number(eventTimeMs)
      if (Number.isFinite(parsed)) return parsed
    }
    const isoCandidate = event.time ?? event.timestamp
    if (typeof isoCandidate === 'string') return isoCandidate
    return accountData.breached_at ?? null
  })()
  const breachDailyHigh = accountData.metrics.daily_peak_balance
  const breachDailyLow = accountData.metrics.daily_low_equity
  const breachPeak = accountData.metrics.highest_balance
  const breachBalance = accountData.metrics.breach_balance
  const dailyBreachBalance = accountData.metrics.daily_breach_balance
  const durationViolationsCount = (accountData.metrics.duration_violations_count ?? 0) > 0
    ? accountData.metrics.duration_violations_count ?? 0
    : (Array.isArray(tradeViolations) ? tradeViolations.length : 0)
  const isFraudBreach = normalizedBreachReason.includes('fraud')
  const accountCurrency = resolveCurrencyCode(accountData)
  const pendingWithdrawalAmount = accountData.pending_withdrawal_amount ?? 0
  const latestUpdateTimestamp = accountData.last_feed_at ?? accountData.last_refresh_requested_at
  const lastUpdatedLabel = formatRelativeUpdate(latestUpdateTimestamp)
  const showForceRefreshButton = isActiveAccount(accountData.objective_status)
    && isOlderThanThirtyMinutes(accountData.last_feed_at)
  return (
    <div className="account-overview-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="account-overview-content">
        {/* Back Button */}
        <div className="back-button">
          <button onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left"></i>
            Back to Accounts Overview
          </button>
        </div>

        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-header-content">
              <h1>Account Overview</h1>
              <p>Detailed metrics and performance data for your trading account</p>
            </div>
          </div>
          <div className="page-header-right">
            {accountData.objective_status === 'breached' && (
              <div className="breach-alert-card">
                <div className="breach-alert-icon">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div className="breach-alert-text">
                  <span className="breach-alert-title">Your account has been breached</span>
                  <span className="breach-alert-subtitle">Download your breach report</span>
                </div>
                <button
                  className="breach-alert-button"
                  onClick={() => void handleDownloadBreachReport()}
                >
                  {isDownloadingBreachReport ? 'Preparing...' : 'Download PDF'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Balance Overview Section */}
        <div className="balance-overview-section">
          <div className="balance-overview-header">
            <span className="balance-overview-title">Balance Overview</span>
            <div className="connection-status-wrap">
              {showForceRefreshButton ? (
                <button
                  type="button"
                  className={`connection-status refresh-action${isRefreshing ? ' refreshing' : ''}`}
                  onClick={() => void handleForceRefresh()}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? 'Updating...' : 'Refresh'}
                </button>
              ) : (
                <span className="connection-status">Last updated: {lastUpdatedLabel}</span>
              )}
            </div>
          </div>
          {hasPendingWithdrawal ? (
            <div className="pending-withdrawal-warning">
              <div className="pending-withdrawal-icon">
                <i className="fas fa-hourglass-half"></i>
              </div>
              <div>
                <h3>Withdrawal Under Review</h3>
                <p>
                  Your withdrawal request for <strong>{formatCurrency(pendingWithdrawalAmount, accountCurrency)}</strong> is being reviewed.
                  Trading is paused for this account until the review completes.
                </p>
              </div>
            </div>
          ) : (
            <div className="balance-grid">
              <div className="balance-card">
                <div className="balance-card-header">
                  <i className="fas fa-wallet"></i>
                  Balance
                </div>
                <div className="balance-value">{formatCurrency(accountData.metrics.balance, accountCurrency)}</div>
              </div>
              <div className="balance-card profit-loss-card">
                {(() => {
                  const initialBalance = accountData.initial_balance ?? parseAccountSize(accountData.account_size)
                  const profitValue = accountData.metrics.balance - initialBalance
                  const profitPercent = initialBalance > 0
                    ? (profitValue / initialBalance) * 100
                    : 0
                  return (
                    <>
                      <span className={`profit-percent-tag ${profitValue >= 0 ? 'positive' : 'negative'}`}>
                        {profitValue >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                      </span>
                      <div className="balance-card-header">
                        <i className="fas fa-chart-line"></i>
                        Profit/Loss
                      </div>
                      <div className={`balance-value ${profitValue >= 0 ? 'positive' : 'negative'}`}>
                        {formatSignedCurrency(profitValue, accountCurrency)}
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="balance-card">
                <div className="balance-card-header">
                  <i className="fas fa-chart-simple"></i>
                  Unrealized PnL
                </div>
                <div className={`balance-value ${accountData.metrics.unrealized_pnl >= 0 ? 'positive' : 'negative'}`}>
                  {formatSignedCurrency(accountData.metrics.unrealized_pnl, accountCurrency)}
                </div>
              </div>
              {accountData.phase === 'Funded' && (
                <div className="balance-card">
                  <div className="balance-card-header">
                    <i className="fas fa-trophy"></i>
                    Total Profit
                  </div>
                  <div className={`balance-value ${(accountData.funded_profit_raw || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {formatSignedCurrency(accountData.funded_profit_raw || 0, accountCurrency)}
                  </div>
                </div>
              )}
              <div className="balance-card today-profit">
                <div className="balance-card-header">
                  Trading Days
                  <i
                    className="fas fa-info-circle"
                    style={{ marginLeft: '6px', fontSize: '12px', opacity: 0.8 }}
                    title="Number of trading days recorded for this cycle."
                  ></i>
                </div>
                <div className="balance-value">{accountData.metrics.trading_days_count ?? 0}</div>
                <div className="balance-card-subtext">
                  <span className="balance-card-subtitle">Trading Cycle</span>
                  <span>Start Date: {formatCycleDate(accountData.metrics.trading_cycle_start)}</span>
                  <span>End Date: Unlimited</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trading Objective Section */}
        {!hasPendingWithdrawal && !isFraudBreach && (
          <div className="trading-objective-section">
            <div className="trading-objective-header">
              <span className="trading-objective-title">Trading Objective</span>
            </div>
            <div className="objectives-list">
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
                          : `Pass • ${accountData.metrics.min_trade_duration_minutes ?? 0} min rule (${durationViolationsCount}/3)`,
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
                    if (key === 'profit_target') {
                      return accountData.metrics.profit_target_balance
                    }
                    if (key === 'max_drawdown') {
                      return accountData.metrics.breach_balance
                    }
                    if (key === 'max_daily_drawdown') {
                      return accountData.metrics.daily_breach_balance
                    }
                    return null
                  })()

                  return (
                    <div key={key} className="objective-item">
                      <div className="objective-content">
                        <i className={`fas fa-${iconConfig.icon} objective-icon ${iconConfig.className}`}></i>
                        <div className="objective-text-section">
                          <span className="objective-text">
                            {key === 'min_trading_days' ? 'Min Trading Days' : effectiveObjective.label}
                          </span>
                          {key === 'min_trading_days' ? (
                            <span className="objective-info">
                              {(() => {
                                if (effectiveObjective.note) {
                                  // Parse format like "11.50h / 24.00h"
                                  const match = effectiveObjective.note.match(/(\d+(?:\.\d+)?)h\s*\/\s*(\d+(?:\.\d+)?)h/)
                                  if (match) {
                                    const elapsedHours = parseFloat(match[1] || '0')
                                    const totalHours = parseFloat(match[2] || '0')
                                    const remainingHours = Math.max(0, totalHours - elapsedHours)

                                    if (remainingHours <= 0) {
                                      return 'Complete'
                                    }

                                    const hours = Math.floor(remainingHours)
                                    const minutes = Math.floor((remainingHours - hours) * 60)

                                    if (hours > 0) {
                                      if (minutes > 0) {
                                        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''} left`
                                      } else {
                                        return `${hours} hour${hours > 1 ? 's' : ''} left`
                                      }
                                    } else if (minutes > 0) {
                                      return `${minutes} minute${minutes > 1 ? 's' : ''} left`
                                    } else {
                                      return 'Complete'
                                    }
                                  }
                                }
                                return effectiveObjective.note || '00:00 Hours'
                              })()}
                            </span>
                          ) : (
                            <>
                              {key === 'profit_target' ? (() => {
                                const profitTargetAmount = accountData.metrics.profit_target_amount
                                const initialBalanceValue = accountData.initial_balance
                                  ?? parseAccountSize(accountData.account_size)
                                const target = profitTargetAmount != null
                                  ? profitTargetAmount
                                  : Math.max(0, (targetBalance ?? initialBalanceValue) - initialBalanceValue)
                                const current = Math.max(0, accountData.metrics.balance - initialBalanceValue)
                                const remaining = Math.max(0, target - current)
                                return (
                                  <div className="objective-metric-group">
                                    <span className="objective-info">Target: {formatCurrency(target, accountCurrency)}</span>
                                    <span className="objective-info">Current: {formatCurrency(current, accountCurrency)}</span>
                                    <span className="objective-info">Remaining: {formatCurrency(remaining, accountCurrency)}</span>
                                  </div>
                                )
                              })() : key === 'max_drawdown' ? (() => {
                                const maxLossLimit = accountData.metrics.max_dd_amount
                                  ?? ((accountData.metrics.highest_balance ?? 0)
                                    - (accountData.metrics.breach_balance ?? 0))
                                const maxLossTillNow = Math.max(
                                  0,
                                  (accountData.metrics.highest_balance ?? 0) - accountData.metrics.equity
                                )
                                const maxPermittedLoss = Math.max(0, maxLossLimit - maxLossTillNow)
                                return (
                                  <div className="objective-metric-group">
                                    <span className="objective-info">Max Loss Limit: {formatCurrency(maxLossLimit, accountCurrency)}</span>
                                    <span className="objective-info">Max Loss till now: {formatCurrency(maxLossTillNow, accountCurrency)}</span>
                                    <span className="objective-info">Max Permitted Loss: {formatCurrency(maxPermittedLoss, accountCurrency)}</span>
                                  </div>
                                )
                              })() : key === 'max_daily_drawdown' ? (() => {
                                const maxDailyLimit = accountData.metrics.daily_dd_amount
                                  ?? ((accountData.metrics.daily_peak_balance ?? 0)
                                    - (accountData.metrics.daily_breach_balance ?? 0))
                                const dailyStartBalance = accountData.metrics.daily_peak_balance
                                  ?? accountData.metrics.balance
                                const dailyLossBase = accountData.metrics.equity
                                  ?? accountData.metrics.balance
                                const maxDailyLossTillNow = Math.max(
                                  0,
                                  dailyStartBalance - dailyLossBase
                                )
                                const todayPermittedLoss = Math.max(0, maxDailyLimit - maxDailyLossTillNow)
                                return (
                                  <div className="objective-metric-group">
                                    <span className="objective-info">Max Daily Limit: {formatCurrency(maxDailyLimit, accountCurrency)}</span>
                                    <span className="objective-info">Max Loss till now: {formatCurrency(maxDailyLossTillNow, accountCurrency)}</span>
                                    <span className="objective-info">Today's Permitted Loss: {formatCurrency(todayPermittedLoss, accountCurrency)}</span>
                                  </div>
                                )
                              })() : (
                                <>
                                  {effectiveObjective.note && <span className="objective-info">{effectiveObjective.note}</span>}
                                  {targetBalance != null && (
                                    <span className="objective-subinfo">
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
                        className={`fas fa-${effectiveObjective.status === 'passed' ? 'check-circle' : effectiveObjective.status === 'breached' ? 'times-circle' : 'far fa-circle'} objective-status ${effectiveObjective.status === 'passed' ? 'completed' : effectiveObjective.status === 'breached' ? 'breached' : 'pending'}`}
                        style={effectiveObjective.status === 'breached' ? { color: '#e74c3c' } : undefined}
                      ></i>
                    </div>
                  )
                })}
            </div>
            <div className="objective-progress-bar"></div>
          </div>
        )}

        {/* Fraud Breach Section */}
        {!hasPendingWithdrawal && isFraudBreach && (
          <div className="trading-objective-section fraud-breach-section">
            <div className="trading-objective-header fraud-breach-header">
              <span className="trading-objective-title">Account Breached</span>
            </div>
            <div className="objective-card breached fraud-breach-card">
              <div className="objective-header">
                <div className="objective-icon breached fraud-breach-icon">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <div className="objective-title">
                  Account Manipulation Detected
                </div>
                <div className="objective-status breached">
                  <i className="fas fa-times-circle"></i>
                </div>
              </div>
              <div className="objective-description">
                Your account has been breached for balance manipulation activity. Please contact support if this is unexpected.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default AccountOverviewPage