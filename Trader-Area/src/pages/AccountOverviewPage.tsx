import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import { fetchUserChallengeAccountDetail, type UserChallengeAccountDetailResponse } from '../lib/traderAuth'
import '../styles/DesktopAccountOverviewPage.css'

const AccountOverviewPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [accountData, setAccountData] = useState<UserChallengeAccountDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const resolveCurrencyCode = (account: UserChallengeAccountDetailResponse) => {
    const currency = account.currency
      ?? account.account_currency
      ?? account.plan_currency
      ?? account.challenge_currency
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff8b8b' }}>
          {error || 'Account not found'}
        </div>
      </div>
    )
  }

  const hasPendingWithdrawal = Boolean(accountData.has_pending_withdrawal)
  const normalizedBreachReason = accountData.breached_reason?.toLowerCase() ?? ''
  const isFraudBreach = normalizedBreachReason.includes('fraud')
  const accountCurrency = resolveCurrencyCode(accountData)
  const pendingWithdrawalAmount = accountData.pending_withdrawal_amount ?? 0
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
          <div className="page-header-right"></div>
        </div>

        {/* Balance Overview Section */}
        <div className="balance-overview-section">
          <div className="balance-overview-header">
            <span className="balance-overview-title">Balance Overview</span>
            <span className="connection-status">Live</span>
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
              <div className="balance-card">
                <div className="balance-card-header">
                  <i className="fas fa-chart-line"></i>
                  Equity
                </div>
                <div className="balance-value">{formatCurrency(accountData.metrics.equity, accountCurrency)}</div>
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
                  Profit
                  <i
                    className="fas fa-info-circle"
                    style={{ marginLeft: '6px', fontSize: '12px', opacity: 0.8 }}
                    title="Current profit compared to the account starting balance."
                  ></i>
                </div>
                {(() => {
                  const initialBalance = accountData.initial_balance ?? parseAccountSize(accountData.account_size)
                  const profitValue = accountData.metrics.balance - initialBalance
                  return (
                    <div className={`balance-value ${profitValue >= 0 ? 'positive' : 'negative'}`}>
                      {formatSignedCurrency(profitValue, accountCurrency)}
                    </div>
                  )
                })()}
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

                  const iconMap: Record<string, { icon: string; className: string }> = {
                    max_drawdown: { icon: 'circle-exclamation', className: 'max-loss' },
                    max_daily_drawdown: { icon: 'triangle-exclamation', className: 'max-loss' },
                    profit_target: { icon: 'bullseye', className: 'profit-target' },
                    min_trade_duration: { icon: 'hourglass-half', className: 'time-rule' },
                    min_trading_days: { icon: 'calendar-days', className: 'trading-days' },
                  }
                  const iconConfig = iconMap[key] ?? { icon: 'clipboard-list', className: 'trading-days' }

                  return (
                    <div key={key} className="objective-item">
                      <div className="objective-content">
                        <i className={`fas fa-${iconConfig.icon} objective-icon ${iconConfig.className}`}></i>
                        <div className="objective-text-section">
                          <span className="objective-text">
                            {key === 'min_trading_days' ? 'Min Trading Days' : objective.label}
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
                      <i
                        className={`fas fa-${objective.status === 'passed' ? 'check-circle' : objective.status === 'breached' ? 'times-circle' : 'far fa-circle'} objective-status ${objective.status === 'passed' ? 'completed' : objective.status === 'breached' ? 'breached' : 'pending'}`}
                        style={objective.status === 'breached' ? { color: '#e74c3c' } : undefined}
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