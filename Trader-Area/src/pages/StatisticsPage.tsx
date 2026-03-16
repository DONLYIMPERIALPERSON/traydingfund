import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import { fetchUserChallengeAccountDetail, type UserChallengeAccountDetailResponse } from '../mocks/auth'
import '../styles/DesktopStatisticsPage.css'

const StatisticsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [accountData, setAccountData] = useState<UserChallengeAccountDetailResponse | null>(null)
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
      <div className="desktop-statistics-page">
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
      <div className="desktop-statistics-page">
        <DesktopHeader />
        <DesktopSidebar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff8b8b' }}>
          {error || 'Account not found'}
        </div>
      </div>
    )
  }
  return (
    <div className="desktop-statistics-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="statistics-content">
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
            <h1>Statistics</h1>
            <p>Performance analysis and trading statistics for your account</p>
          </div>
          <button className="refresh-button" onClick={() => window.location.reload()}>
            <i className="fas fa-sync-alt"></i>
            Refresh
          </button>
        </div>

        {/* Performance Section */}
        <div className="performance-section">
          <div className="performance-header">
            <div className="performance-header-left">
              <i className="fas fa-chart-pie"></i>
              <span className="performance-title">Performance</span>
            </div>
            <span className="time-period">this month</span>
          </div>
          <div className="performance-grid">
            <div className="performance-card">
              <div className="card-header">
                <i className="fas fa-trophy"></i>
                Win Rate
              </div>
              <div className="card-value">
                {Math.round(accountData.metrics.win_rate * 100)}<span className="percentage">%</span>
              </div>
              <div className="card-change">
                <i className="fas fa-chart-line"></i>
                Overall performance
              </div>
            </div>
            <div className="performance-card">
              <div className="card-header">
                <i className="fas fa-arrow-right-arrow-left"></i>
                No. of trades
              </div>
              <div className="card-value">{accountData.metrics.closed_trades_count}</div>
              <div className="card-change neutral">
                <i className="fas fa-clock"></i>
                Total trades
              </div>
            </div>
          </div>
        </div>

        {/* Daily Summary Section */}
        <div className="daily-summary-section">
          <div className="daily-summary-header">
            <i className="fas fa-calendar-lines"></i>
            <span className="daily-summary-title">Daily Summary</span>
          </div>

          {/* Table Header */}
          <div className="table-header">
            <span>Date</span>
            <span>Trades</span>
            <span>Lots</span>
            <span>Result</span>
          </div>

          {/* Table Rows */}
          <div className="table-rows">
            <div className="table-row">
              <span className="table-cell">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <span className="table-cell">{accountData.metrics.today_trades_count}</span>
              <span className="table-cell">{accountData.metrics.today_lots_total.toFixed(2)}</span>
              <span className={`result-cell ${accountData.metrics.today_closed_pnl >= 0 ? 'positive' : 'negative'}`}>
                <i className={`fas fa-${accountData.metrics.today_closed_pnl >= 0 ? 'plus' : 'minus'}-circle`}></i>
                {accountData.metrics.today_closed_pnl >= 0 ? '+' : ''}${accountData.metrics.today_closed_pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="table-footer">
            <span>
              <i className="fas fa-regular fa-circle"></i> today's trading activity
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default StatisticsPage