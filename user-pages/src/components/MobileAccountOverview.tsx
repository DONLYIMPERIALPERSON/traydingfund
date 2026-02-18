import React from 'react'
import '../styles/MobileAccountOverview.css'

const MobileAccountOverview: React.FC = () => {
  return (
    <div className="section">
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px'}}>
        <span className="text-small"><i className="fas fa-chart-simple" style={{color: '#FFD700', marginRight: '6px'}}></i> Account overview</span>
        <span style={{color: 'rgba(255,215,0,0.9)', fontSize: '12px', background: 'rgba(255,215,0,0.12)', padding: '4px 12px', borderRadius: '30px'}}>live</span>
      </div>

      <div className="account-status-grid">
        <div className="account-info-card">
          <div className="label">
            <i className="fas fa-circle" style={{color: '#2ecc71', fontSize: '12px'}}></i> Status
          </div>
          <div className="status-active">
            <i className="fas fa-check-circle"></i> Active
          </div>
        </div>
        <div className="account-info-card">
          <div className="label">
            <i className="fas fa-scale-balanced" style={{color: '#FFD700'}}></i> Account size
          </div>
          <div className="value">N100,000</div>
        </div>
        <div className="account-info-card">
          <div className="label">
            <i className="fas fa-tag" style={{color: '#FFD700'}}></i> Account Type
          </div>
                <div className="value value-small">Phase 1</div>
        </div>
        <div className="account-info-card">
          <div className="label">
            <i className="fas fa-terminal" style={{color: '#FFD700'}}></i> Platform
          </div>
          <div className="platform-badge">
            <i className="fas fa-chart-line mt5-icon"></i> MT5
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileAccountOverview