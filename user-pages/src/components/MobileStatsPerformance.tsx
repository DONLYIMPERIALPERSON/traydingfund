import React from 'react'
import '../styles/MobileStatsPerformance.css'

const MobileStatsPerformance: React.FC = () => {
  return (
    <div className="section mobile-stats-performance-section">
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px'}}>
        <span className="text-small"><i className="fas fa-chart-pie" style={{color: '#FFD700', marginRight: '6px'}}></i> Performance</span>
        <span style={{color: 'rgba(255,215,0,0.8)', fontSize: '13px', background: 'rgba(255,215,0,0.12)', padding: '4px 12px', borderRadius: '30px'}}>this month</span>
      </div>
      <div className="mobile-stats-grid">
        <div className="mobile-stat-card">
          <div className="mobile-stat-label">
            <i className="fas fa-trophy" style={{color: '#FFD700'}}></i> Win Rate
          </div>
          <div className="mobile-stat-number">78<span style={{fontSize: '24px', color: '#FFD700'}}>%</span></div>
          <div className="mobile-stat-tag">
            <i className="fas fa-arrow-up" style={{color: '#2ecc71'}}></i> +12% vs last month
          </div>
        </div>
        <div className="mobile-stat-card">
          <div className="mobile-stat-label">
            <i className="fas fa-arrow-right-arrow-left" style={{color: '#FFD700'}}></i> No. of trades
          </div>
          <div className="mobile-stat-number">143</div>
          <div className="mobile-stat-tag">
            <i className="fas fa-clock"></i> since 1 Jan
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileStatsPerformance