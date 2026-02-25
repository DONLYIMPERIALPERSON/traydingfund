import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import { fetchPublicChallengePlans, type PublicChallengePlan } from '../lib/auth'
import '../styles/DesktopStartChallengePage.css'

type AccountView = {
  id: string
  size: string
  drawdown: string
  target: string
  phases: string
  days: string
  payout: string
  fee: string
  status: 'available' | 'paused'
  profit_split: string
  profit_cap: string
}

const toAccountView = (plan: PublicChallengePlan): AccountView => ({
  id: plan.id,
  size: plan.name.replace(/^₦/i, '').replace(/account/i, '').trim(),
  drawdown: plan.max_drawdown,
  target: plan.profit_target,
  phases: plan.phases,
  days: plan.min_trading_days,
  payout: plan.payout_frequency,
  fee: plan.price,
  status: plan.status === 'Available' && plan.enabled ? 'available' : 'paused',
  profit_split: plan.profit_split,
  profit_cap: plan.profit_cap,
})

const DesktopTradingAccountsPage: React.FC = () => {
  const navigate = useNavigate()
  const [showNumbers, setShowNumbers] = useState<{[key: string]: boolean}>({})
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountView[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    setLoading(true)
    setLoadError('')
    fetchPublicChallengePlans()
      .then((plans) => setAccounts(plans.map(toAccountView)))
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load trading account plans')
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleShowNumbers = (accountSize: string) => {
    setShowNumbers(prev => ({
      ...prev,
      [accountSize]: !prev[accountSize]
    }))
  }

  const getAccountSizeNumber = (size: string) => {
    const normalized = size.toLowerCase().replace(/[^0-9.km]/g, '')
    if (normalized.includes('k')) return parseFloat(normalized.replace('k', '')) * 1000
    if (normalized.includes('m')) return parseFloat(normalized.replace('m', '')) * 1000000
    return 0
  }

  const getDisplayValue = (accountSize: string, percentage: string) => {
    if (!showNumbers[accountSize]) return percentage

    const accountNumber = getAccountSizeNumber(accountSize)
    const percentValue = parseInt(percentage.replace('%', ''))
    const actualAmount = (accountNumber * percentValue) / 100

    if (actualAmount >= 1000000) return `₦${(actualAmount / 1000000).toFixed(1)}m`
    if (actualAmount >= 1000) return `₦${(actualAmount / 1000).toFixed(0)}k`
    return `₦${actualAmount.toLocaleString()}`
  }

  return (
    <div className="desktop-start-challenge-page">
      <DesktopHeader />
      <DesktopSidebar />

      <div className="start-challenge-content">
        <div className="page-header">
          <h1>Trading Accounts</h1>
          <p>Choose your account type and click Start Now to continue to checkout.</p>
        </div>

        <div className="trading-accounts-section">
          <i className="fas fa-chart-line"></i>
          <span className="trading-accounts-title">Account Types</span>
        </div>

        {loading ? (
          <div className="desktop-checkout-empty">Loading trading accounts...</div>
        ) : loadError ? (
          <div className="desktop-checkout-empty">{loadError}</div>
        ) : accounts.length === 0 ? (
          <div className="desktop-checkout-empty">No account plans are currently available.</div>
        ) : (
        <div className="accounts-grid">
          {accounts.map((account, index) => (
            <div key={index} className="account-card">
              <div className="account-header">
                <div>
                  <div className="account-size">{account.size}</div>
                  <div className="account-type">MT5 Account</div>
                </div>
                {account.status === 'paused' && <div className="account-status">Paused</div>}
              </div>

              <div className="show-numbers-toggle">
                <span className="toggle-label">Show Numbers</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showNumbers[account.size] || false}
                    onChange={() => toggleShowNumbers(account.size)}
                  />
                  <span className="toggle-slider"><span></span></span>
                </label>
              </div>

              <div className="account-specifications">
                <div className="spec-row"><span className="spec-label">Max Drawdown</span><span className="spec-value">{getDisplayValue(account.size, account.drawdown)}</span></div>
                <div className="spec-row"><span className="spec-label">Target</span><span className="spec-value">{getDisplayValue(account.size, account.target)}</span></div>
                <div className="spec-row"><span className="spec-label">Phases</span><span className="spec-value">{account.phases}</span></div>
                <div className="spec-row"><span className="spec-label">Profit Split</span><span className="spec-value">{account.profit_split}</span></div>

                {account.profit_cap && (
                  <div className="spec-row max-payout">
                    <span className="spec-label-with-info">
                      Payout Cap
                      <i
                        className="fas fa-info-circle info-icon"
                        onClick={() => setShowTooltip(showTooltip === `${account.size}-max-payout` ? null : `${account.size}-max-payout`)}
                      ></i>
                    </span>
                    <span className="spec-value">{account.profit_cap}</span>
                    {showTooltip === `${account.size}-max-payout` && (
                      <div className="tooltip">
                        Payout cap for {account.size} accounts is {account.profit_cap} per payout cycle.
                        <div className="tooltip-arrow"></div>
                      </div>
                    )}
                  </div>
                )}

                <div className="spec-row"><span className="spec-label">Payout</span><span className="spec-value">1 Minute</span></div>
                <div className="spec-row"><span className="spec-label">Fee</span><span className="spec-value fee">{account.fee}</span></div>
              </div>

              <button
                className="start-button"
                onClick={() => account.status !== 'paused' && navigate('/start-challenge', { state: account })}
                disabled={account.status === 'paused'}
                style={{
                  backgroundColor: account.status === 'paused' ? '#ccc' : undefined,
                  color: account.status === 'paused' ? '#666' : undefined,
                  cursor: account.status === 'paused' ? 'not-allowed' : undefined
                }}
              >
                {account.status === 'paused' ? 'Paused' : 'Start Now'}
              </button>
            </div>
          ))}
        </div>
        )}
      </div>

      <DesktopFooter />
    </div>
  )
}

export default DesktopTradingAccountsPage