import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import { fetchUserChallengeAccountDetail, refreshChallengeAccount, type UserChallengeAccountDetailResponse } from '../lib/auth'
import '../styles/DesktopAccountOverviewPage.css'

const DesktopAccountOverviewPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [accountData, setAccountData] = useState<UserChallengeAccountDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshCooldown, setRefreshCooldown] = useState(0)
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null)
  const [autoUpdating, setAutoUpdating] = useState(false)

  const challengeId = searchParams.get('challenge_id')

  const loadAccountData = useCallback(async () => {
    if (!challengeId) return

    try {
      const data = await fetchUserChallengeAccountDetail(challengeId)
      setAccountData(data)
      setError('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load account details')
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

  // Cooldown timer
  useEffect(() => {
    if (refreshCooldown > 0) {
      const timer = setTimeout(() => setRefreshCooldown(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [refreshCooldown])

  // Polling after refresh
  useEffect(() => {
    if (!lastRefreshTime || !accountData || !challengeId) return

    const pollInterval = setInterval(async () => {
      try {
        if (!challengeId) return
        const data = await fetchUserChallengeAccountDetail(challengeId)
        setAccountData(data)

        // Stop polling if last_feed_at is newer than refresh time
        if (data.last_feed_at) {
          const feedTime = new Date(data.last_feed_at).getTime()
          if (feedTime > lastRefreshTime) {
            setRefreshing(false)
            setLastRefreshTime(null)
            clearInterval(pollInterval)
            return
          }
        }

        // Stop polling after 60 seconds
        if (Date.now() - lastRefreshTime > 60000) {
          setRefreshing(false)
          setLastRefreshTime(null)
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [lastRefreshTime, accountData, challengeId])

  // Automatic real-time updates (every 30 seconds)
  useEffect(() => {
    if (!accountData || !challengeId) return

    const currentChallengeId = challengeId
    const autoUpdateInterval = setInterval(async () => {
      if (!currentChallengeId) return
      try {
        setAutoUpdating(true)
        const data = await fetchUserChallengeAccountDetail(currentChallengeId)

        // Only update the metrics that change frequently (balance, equity, pnl, max loss)
        setAccountData(prevData => {
          if (!prevData) return data

          return {
            ...prevData,
            metrics: {
              ...prevData.metrics,
              balance: data.metrics.balance,
              equity: data.metrics.equity,
              unrealized_pnl: data.metrics.unrealized_pnl,
              max_permitted_loss_left: data.metrics.max_permitted_loss_left,
              // Keep other metrics unchanged
              highest_balance: prevData.metrics.highest_balance,
              breach_balance: prevData.metrics.breach_balance,
              profit_target_balance: prevData.metrics.profit_target_balance,
              win_rate: prevData.metrics.win_rate,
              closed_trades_count: prevData.metrics.closed_trades_count,
              winning_trades_count: prevData.metrics.winning_trades_count,
              lots_traded_total: prevData.metrics.lots_traded_total,
              today_closed_pnl: prevData.metrics.today_closed_pnl,
              today_trades_count: prevData.metrics.today_trades_count,
              today_lots_total: prevData.metrics.today_lots_total,
              min_trading_days_required: prevData.metrics.min_trading_days_required,
              min_trading_days_met: prevData.metrics.min_trading_days_met,
              stage_elapsed_hours: prevData.metrics.stage_elapsed_hours,
              scalping_violations_count: prevData.metrics.scalping_violations_count,
            },
            last_feed_at: data.last_feed_at,
            last_refresh_requested_at: data.last_refresh_requested_at,
          }
        })

        setAutoUpdating(false)
      } catch (err) {
        console.error('Auto-update error:', err)
        setAutoUpdating(false)
      }
    }, 30000) // Update every 30 seconds

    return () => clearInterval(autoUpdateInterval)
  }, [accountData, challengeId])

  const handleRefresh = async () => {
    if (!challengeId || refreshing || refreshCooldown > 0) return

    try {
      setRefreshing(true)
      const result = await refreshChallengeAccount(challengeId)

      if (result.status === 'queued') {
        setLastRefreshTime(Date.now())
        // Start cooldown
        setRefreshCooldown(60)
      }
    } catch (err: unknown) {
      setRefreshing(false)
      if (err instanceof Error && err.message.includes('429')) {
        // Extract cooldown time from error if available
        const match = err.message.match(/(\d+)/)
        if (match) {
          setRefreshCooldown(parseInt(match[1]))
        } else {
          setRefreshCooldown(60)
        }
      } else {
        alert('Failed to refresh account data. Please try again.')
      }
    }
  }

  const formatLastUpdated = (lastFeedAt: string | null): string => {
    if (!lastFeedAt) return 'Not updated yet'

    const now = new Date()
    const feedTime = new Date(lastFeedAt)
    const diffMs = now.getTime() - feedTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff8b8b' }}>
          {error || 'Account not found'}
        </div>
      </div>
    )
  }
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
              <div className="last-updated">
                <i className={`fas ${autoUpdating ? 'fa-spinner fa-spin' : 'fa-clock'}`}></i>
                Last updated: {formatLastUpdated(accountData.last_feed_at)}
                {autoUpdating && <span className="auto-update-indicator">(Auto-updating...)</span>}
              </div>
            </div>
          </div>
          <div className="page-header-right">
            <div className="mt5-account-info">
              <i className="fas fa-server"></i>
              <span>MT5 Account: {accountData.mt5_account || 'N/A'}</span>
            </div>
            <button
              className={`refresh-button ${refreshing ? 'refreshing' : ''} ${refreshCooldown > 0 ? 'cooldown' : ''}`}
              onClick={handleRefresh}
              disabled={refreshing || refreshCooldown > 0}
            >
              <i className={`fas ${refreshing ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
              {refreshing ? 'Updating...' : refreshCooldown > 0 ? `Refresh in ${refreshCooldown}s` : 'Update Stats'}
            </button>
          </div>
        </div>

        {/* Balance Overview Section */}
        <div className="balance-overview-section">
          <div className="balance-overview-header">
            <span className="balance-overview-title">Balance Overview</span>
            <span className="connection-status">Live</span>
          </div>
          <div className="balance-grid">
            <div className="balance-card">
              <div className="balance-card-header">
                <i className="fas fa-wallet"></i>
                Balance
              </div>
              <div className="balance-value">N{accountData.metrics.balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="balance-card">
              <div className="balance-card-header">
                <i className="fas fa-chart-line"></i>
                Equity
              </div>
              <div className="balance-value">N{accountData.metrics.equity.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="balance-card">
              <div className="balance-card-header">
                <i className="fas fa-chart-simple"></i>
                Unrealized PnL
              </div>
              <div className={`balance-value ${accountData.metrics.unrealized_pnl >= 0 ? 'positive' : 'negative'}`}>
                {accountData.metrics.unrealized_pnl >= 0 ? '+' : ''}N{accountData.metrics.unrealized_pnl.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            {accountData.phase === 'Funded' && (
              <div className="balance-card">
                <div className="balance-card-header">
                  <i className="fas fa-trophy"></i>
                  Total Profit
                </div>
                <div className={`balance-value ${(accountData.funded_profit_raw || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {(accountData.funded_profit_raw || 0) >= 0 ? '+' : ''}N{(accountData.funded_profit_raw || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}
            <div className="balance-card today-profit">
              <div className="balance-card-header">
                Remaining loss limit
                <i
                  className="fas fa-info-circle"
                  style={{ marginLeft: '6px', fontSize: '12px', opacity: 0.8 }}
                  title="Amount left before account breaches maximum drawdown."
                ></i>
              </div>
              <div className="balance-value">N{accountData.metrics.max_permitted_loss_left.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

        {/* Trading Objective Section */}
        <div className="trading-objective-section">
          <div className="trading-objective-header">
            <span className="trading-objective-title">Trading Objective</span>
          </div>
          <div className="objectives-list">
            {Object.entries(accountData.objectives).map(([key, objective]) => (
              <div key={key} className="objective-item">
                <div className="objective-content">
                  <i className={`fas fa-${key === 'max_drawdown' ? 'circle-exclamation' : key === 'profit_target' ? 'bullseye' : key === 'scalping_rule' ? 'hourglass-half' : 'calendar-days'} objective-icon ${key === 'max_drawdown' ? 'max-loss' : key === 'profit_target' ? 'profit-target' : key === 'scalping_rule' ? 'time-rule' : 'trading-days'}`}></i>
                  <div className="objective-text-section">
                    <span className="objective-text">
                      {key === 'min_trading_days' ? 'Cool Down Period' : objective.label}
                    </span>
                    {key === 'min_trading_days' ? (
                      <span className="objective-info">
                        {(() => {
                          if (objective.note) {
                            // Parse format like "11.50h / 24.00h"
                            const match = objective.note.match(/(\d+(?:\.\d+)?)h\s*\/\s*(\d+(?:\.\d+)?)h/)
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
                        return objective.note || '00:00 Hours'
                        })()}
                      </span>
                    ) : (
                      objective.note && <span className="objective-info">{objective.note}</span>
                    )}
                  </div>
                </div>
                <i className={`fas fa-${objective.status === 'passed' ? 'check-circle' : objective.status === 'breached' ? 'times-circle' : 'far fa-circle'} objective-status ${objective.status === 'passed' ? 'completed' : objective.status === 'breached' ? 'breached' : 'pending'}`} style={objective.status === 'breached' ? {color: '#e74c3c'} : undefined}></i>
              </div>
            ))}
          </div>
          <div className="objective-progress-bar"></div>
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopAccountOverviewPage