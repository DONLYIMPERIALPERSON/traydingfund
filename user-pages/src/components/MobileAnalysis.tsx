import React from 'react'
import '../styles/MobileAnalysis.css'

const MobileAnalysis: React.FC = () => {
  return (
    <div className="section">
      <span className="text-small" style={{textTransform: 'uppercase', fontWeight: '600', color: 'rgba(255,255,255,0.5)'}}>Analysis</span>
      <div className="analysis-duo mt-2">
        <div className="analysis-item">
          <div className="analysis-label">
            <i className="fas fa-arrow-trend-up" style={{color: '#FFD700'}}></i> Total's P/L
          </div>
          <div className="analysis-number">N0.00</div>
          <div className="analysis-sub">lifetime profit</div>
        </div>
        <div className="analysis-item">
          <div className="analysis-label">
            <i className="fas fa-flag-checkered" style={{color: '#FFD700'}}></i> Max P/L
          </div>
          <div className="analysis-number">N0.00</div>
          <div className="analysis-sub">peak to valley</div>
        </div>
      </div>
    </div>
  )
}

export default MobileAnalysis