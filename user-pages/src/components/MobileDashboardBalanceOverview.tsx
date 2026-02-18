import React from 'react'
import '../styles/MobileDashboardBalanceOverview.css'

const MobileDashboardBalanceOverview: React.FC = () => {
  return (
    <div className="section">
      <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
        <span className="text-small" style={{color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: '600'}}>Balance overview</span>
        <span style={{color: '#FFD700', fontSize: '10px', background: 'rgba(255,215,0,0.15)', padding: '3px 8px', borderRadius: '30px'}}>Connected</span>
      </div>
      <div className="balance-grid">
        <div className="metric-tile">
          <div className="label"><i className="fas fa-wallet" style={{color: '#FFD700', fontSize: '12px'}}></i> Balance</div>
          <div className="value">N100,000</div>
        </div>
        <div className="metric-tile">
          <div className="label"><i className="fas fa-chart-line" style={{color: '#FFD700'}}></i> Equity</div>
          <div className="value">N100,000</div>
        </div>
        <div className="metric-tile">
          <div className="label"><i className="fas fa-chart-simple"></i> Unrealized PnL</div>
          <div className="value">N0.00</div>
        </div>
        <div className="metric-tile highlight-yellow">
          <div className="label"><i className="fas fa-sun" style={{color: '#FFD700'}}></i> Today's Profit</div>
          <div className="value">N0.00</div>
        </div>
      </div>
    </div>
  )
}

export default MobileDashboardBalanceOverview