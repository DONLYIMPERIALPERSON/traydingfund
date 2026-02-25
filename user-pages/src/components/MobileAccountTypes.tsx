import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPublicChallengePlans, type PublicChallengePlan } from '../lib/auth'
import '../styles/MobileAccountTypes.css'

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

const MobileAccountTypes: React.FC = () => {
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
    if (normalized.includes('k')) {
      return parseFloat(normalized.replace('k', '')) * 1000
    } else if (normalized.includes('m')) {
      return parseFloat(normalized.replace('m', '')) * 1000000
    }
    return 0
  }

  const getDisplayValue = (accountSize: string, percentage: string) => {
    if (!showNumbers[accountSize]) {
      return percentage
    }

    const accountNumber = getAccountSizeNumber(accountSize)
    const percentValue = parseInt(percentage.replace('%', ''))
    const actualAmount = (accountNumber * percentValue) / 100

    if (actualAmount >= 1000000) {
      return `₦${(actualAmount / 1000000).toFixed(1)}m`
    } else if (actualAmount >= 1000) {
      return `₦${(actualAmount / 1000).toFixed(0)}k`
    } else {
      return `₦${actualAmount.toLocaleString()}`
    }
  }

  return (
    <div className="mobile-account-types">
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
        <span className="mobile-account-types-title"><i className="fas fa-chart-line" style={{color: '#FFD700', marginRight: '6px'}}></i> Trading Accounts</span>
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.75)', padding: '12px 0' }}>Loading trading accounts...</div>
      ) : loadError ? (
        <div style={{ color: '#ff8b8b', padding: '12px 0' }}>{loadError}</div>
      ) : accounts.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.75)', padding: '12px 0' }}>No account plans are currently available.</div>
      ) : (
      <div className="mobile-accounts-list">
        {accounts.map((account, index) => (
          <div key={index} className="mobile-account-card">
            <div className="mobile-account-header">
              <div className="mobile-account-size">{account.size}</div>
              <div className="mobile-account-platform">MT5 Account</div>
            </div>

            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px'}}>
              <span style={{fontSize: '14px', color: 'rgba(255,255,255,0.6)'}}>Show Numbers</span>
              <label style={{position: 'relative', display: 'inline-block', width: '44px', height: '24px'}}>
                <input
                  type="checkbox"
                  checked={showNumbers[account.size] || false}
                  onChange={() => toggleShowNumbers(account.size)}
                  style={{opacity: 0, width: 0, height: 0}}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: showNumbers[account.size] ? '#FFD700' : 'rgba(255,255,255,0.2)',
                  borderRadius: '24px',
                  transition: '0.3s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: showNumbers[account.size] ? '22px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s'
                  }}></span>
                </span>
              </label>
            </div>

            <div className="mobile-account-specs">
              <div className="mobile-spec-row">
                <span className="mobile-spec-label">Max Drawdown</span>
                <span className="mobile-spec-value">{getDisplayValue(account.size, account.drawdown)}</span>
              </div>
              <div className="mobile-spec-row">
                <span className="mobile-spec-label">Target</span>
                <span className="mobile-spec-value">{getDisplayValue(account.size, account.target)}</span>
              </div>
              <div className="mobile-spec-row">
                <span className="mobile-spec-label">Phases</span>
                <span className="mobile-spec-value">{account.phases}</span>
              </div>
              <div className="mobile-spec-row">
                <span className="mobile-spec-label">Profit Split</span>
                <span className="mobile-spec-value">{account.profit_split}</span>
              </div>
              {account.profit_cap && (
                <div className="mobile-spec-row" style={{position: 'relative'}}>
                  <span className="mobile-spec-label" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                    Payout Cap
                    <i
                      className="fas fa-info-circle"
                      style={{color: '#FFD700', fontSize: '12px', cursor: 'pointer'}}
                      onClick={() => setShowTooltip(showTooltip === `${account.size}-max-payout` ? null : `${account.size}-max-payout`)}
                    ></i>
                  </span>
                  <span className="mobile-spec-value">{account.profit_cap}</span>
                  {showTooltip === `${account.size}-max-payout` && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '0',
                      right: '0',
                      background: 'rgba(0,0,0,0.9)',
                      border: '1px solid rgba(255,215,0,0.3)',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '12px',
                      color: 'white',
                      zIndex: 1000,
                      marginTop: '4px',
                      lineHeight: '1.4'
                    }}>
                      Payout cap for {account.size} accounts is {account.profit_cap} per payout cycle.
                      <div style={{
                        position: 'absolute',
                        top: '-6px',
                        left: '20px',
                        width: '0',
                        height: '0',
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderBottom: '6px solid rgba(0,0,0,0.9)'
                      }}></div>
                    </div>
                  )}
                </div>
              )}
              <div className="mobile-spec-row">
                <span className="mobile-spec-label">Payout</span>
                <span className="mobile-spec-value">1 Minute</span>
              </div>
              <div className="mobile-spec-row">
                <span className="mobile-spec-label">Fee</span>
                <span className="mobile-spec-value mobile-spec-fee">{account.fee}</span>
              </div>
            </div>

            <div className="mobile-account-action">
              <button
                className={`mobile-start-button ${account.status === 'paused' ? 'mobile-start-button-paused' : ''}`}
                onClick={() => account.status !== 'paused' && navigate('/start-challenge', { state: account })}
              >
                {account.status === 'paused' ? 'Paused' : 'Start Now'}
              </button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}

export default MobileAccountTypes