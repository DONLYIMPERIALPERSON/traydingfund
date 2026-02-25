import React from 'react'
import '../styles/MobileDashboardBalanceOverview.css'

interface MobileDashboardBalanceOverviewProps {
  balance: number
  equity: number
  unrealizedPnl: number
  maxPermittedLossLeft: number
}

const MobileDashboardBalanceOverview: React.FC<MobileDashboardBalanceOverviewProps> = ({
  balance,
  equity,
  unrealizedPnl,
  maxPermittedLossLeft,
}) => {
  const formatCurrency = (amount: number) => {
    return `N${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="section">
      <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
        <span className="text-small" style={{color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: '600'}}>Balance overview</span>
        <span style={{color: '#2ecc71', fontSize: '10px', background: 'rgba(46, 204, 113, 0.15)', padding: '3px 8px', borderRadius: '30px'}}>Live</span>
      </div>
      <div className="balance-grid">
        <div className="metric-tile">
          <div className="label"><i className="fas fa-wallet" style={{color: '#FFD700', fontSize: '12px'}}></i> Balance</div>
          <div className="value">{formatCurrency(balance)}</div>
        </div>
        <div className="metric-tile">
          <div className="label"><i className="fas fa-chart-line" style={{color: '#FFD700'}}></i> Equity</div>
          <div className="value">{formatCurrency(equity)}</div>
        </div>
        <div className="metric-tile">
          <div className="label"><i className="fas fa-chart-simple"></i> Unrealized PnL</div>
          <div className="value" style={{color: unrealizedPnl >= 0 ? '#2ecc71' : '#e74c3c'}}>
            {unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(unrealizedPnl)}
          </div>
        </div>
        <div className="metric-tile highlight-yellow">
          <div className="label" title="Amount left before account breaches maximum drawdown."><i className="fas fa-sun" style={{color: '#FFD700'}}></i> Remaining Loss Limit</div>
          <div className="value">{formatCurrency(maxPermittedLossLeft)}</div>
        </div>
      </div>
    </div>
  )
}

export default MobileDashboardBalanceOverview
