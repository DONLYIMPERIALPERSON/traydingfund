import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import MobileDashboardHeader from '../components/MobileDashboardHeader'
import MobileDashboardBalanceOverview from '../components/MobileDashboardBalanceOverview'
import MobileTradingObjective from '../components/MobileTradingObjective'
import MobileStatsPerformance from '../components/MobileStatsPerformance'
import MobileDailySummary from '../components/MobileDailySummary'
import MobileCredentials from '../components/MobileCredentials'
import { fetchUserChallengeAccountDetail, refreshChallengeAccount, type UserChallengeAccountDetailResponse } from '../lib/auth'
import '../styles/MobileAccountDetailsPage.css'

const MobileAccountDetailsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<string>('Overview')
  const [accountData, setAccountData] = useState<UserChallengeAccountDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshCooldown, setRefreshCooldown] = useState(0)
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null)

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
    if (!lastRefreshTime || !accountData) return

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
      try {
        if (!currentChallengeId) return
        const data = await fetchUserChallengeAccountDetail(currentChallengeId!)

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
      } catch (err) {
        console.error('Auto-update error:', err)
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
        // Start cooldown - calculate remaining time based on last refresh
        if (accountData?.last_refresh_requested_at) {
          const lastRefresh = new Date(accountData.last_refresh_requested_at).getTime()
          const now = Date.now()
          const elapsed = Math.floor((now - lastRefresh) / 1000)
          const remaining = Math.max(0, 60 - elapsed) // 60 second cooldown
          setRefreshCooldown(remaining)
        } else {
          setRefreshCooldown(60)
        }
      }
    } catch (err: unknown) {
      setRefreshing(false)
      if (err instanceof Error && err.message.includes('429')) {
        // Extract cooldown time from error if available
        const match = err.message.match(/(\d+)/)
        if (match) {
          setRefreshCooldown(parseInt(match[1]))
        } else {
          // Calculate remaining time based on last refresh
          if (accountData?.last_refresh_requested_at) {
            const lastRefresh = new Date(accountData.last_refresh_requested_at).getTime()
            const now = Date.now()
            const elapsed = Math.floor((now - lastRefresh) / 1000)
            const remaining = Math.max(0, 60 - elapsed)
            setRefreshCooldown(remaining)
          } else {
            setRefreshCooldown(60)
          }
        }
      } else {
        alert('Failed to refresh account data. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="mobile-account-details-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>
          Loading account details...
        </div>
      </div>
    )
  }

  if (error || !accountData) {
    return (
      <div className="mobile-account-details-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff8b8b' }}>
          {error || 'Account not found'}
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <>
            <div className="mobile-account-details-card">
              <MobileDashboardBalanceOverview
                balance={accountData.metrics.balance}
                equity={accountData.metrics.equity}
                unrealizedPnl={accountData.metrics.unrealized_pnl}
                maxPermittedLossLeft={accountData.metrics.max_permitted_loss_left}
              />
            </div>
            <div className="mobile-account-details-card mobile-account-details-card-spaced">
              <MobileTradingObjective objectives={accountData.objectives} />
            </div>
          </>
        )
      case 'Account':
        return (
          <>
            {accountData.credentials && (
              <div className="mobile-account-details-card">
                <MobileCredentials
                  server={accountData.credentials.server}
                  accountNumber={accountData.credentials.account_number}
                  password={accountData.credentials.password}
                />
              </div>
            )}
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="mobile-account-details-page">
      <div className="mobile-account-details-fixed-header">
        <div className="mobile-account-details-header-shell">
          <MobileDashboardHeader
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            refreshCooldown={refreshCooldown}
            lastUpdated={accountData.last_feed_at}
          />
        </div>
      </div>

      <div className="mobile-account-details-content">
        {renderContent()}
      </div>
    </div>
  )
}

export default MobileAccountDetailsPage
