import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopStartChallengePage.css'

const DesktopTradingAccountsPage: React.FC = () => {
  const navigate = useNavigate()
  const [showNumbers, setShowNumbers] = useState<{[key: string]: boolean}>({})
  const [showTooltip, setShowTooltip] = useState<string | null>(null)

  const accounts = [
    { size: '200k', drawdown: '20%', target: '10%', phases: '2', days: '1', payout: '24hr', fee: '₦8,900', status: 'available' },
    { size: '400k', drawdown: '20%', target: '10%', phases: '2', days: '1', payout: '24hr', fee: '₦18,500', status: 'available' },
    { size: '600k', drawdown: '20%', target: '10%', phases: '2', days: '1', payout: '24hr', fee: '₦28,000', status: 'available' },
    { size: '800k', drawdown: '20%', target: '10%', phases: '2', days: '1', payout: '24hr', fee: '₦38,000', status: 'available' },
    { size: '1.5m', drawdown: '20%', target: '10%', phases: '2', days: '1', payout: '24hr', fee: '₦99,000', status: 'available' },
    { size: '3m', drawdown: '20%', target: '10%', phases: '2', days: '1', payout: '24hr', fee: '₦180,000', status: 'paused' },
  ]

  const toggleShowNumbers = (accountSize: string) => {
    setShowNumbers(prev => ({
      ...prev,
      [accountSize]: !prev[accountSize]
    }))
  }

  const getAccountSizeNumber = (size: string) => {
    if (size.includes('k')) return parseInt(size.replace('k', '')) * 1000
    if (size.includes('m')) return parseInt(size.replace('m', '')) * 1000000
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
                <div className="spec-row"><span className="spec-label">Min. Trading Days</span><span className="spec-value">{account.days}</span></div>
                <div className="spec-row"><span className="spec-label">Profit Split</span><span className="spec-value">70%</span></div>

                {(account.size === '1.5m' || account.size === '3m') && (
                  <div className="spec-row max-payout">
                    <div>
                      <span className="spec-label-with-info">
                        Max Payout
                        <i
                          className="fas fa-info-circle info-icon"
                          onClick={() => setShowTooltip(showTooltip === `${account.size}-max-payout` ? null : `${account.size}-max-payout`)}
                        ></i>
                      </span>
                      <span className="spec-value">50%</span>
                    </div>
                    {showTooltip === `${account.size}-max-payout` && (
                      <div className="tooltip">
                        Maximum payout for {account.size} accounts is capped at 50% per payout cycle.
                        <div className="tooltip-arrow"></div>
                      </div>
                    )}
                  </div>
                )}

                <div className="spec-row"><span className="spec-label">24hr Payout</span><span className="spec-value">{account.payout}</span></div>
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
      </div>

      <DesktopFooter />
    </div>
  )
}

export default DesktopTradingAccountsPage