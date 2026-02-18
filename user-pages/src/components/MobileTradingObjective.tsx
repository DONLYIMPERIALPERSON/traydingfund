import React from 'react'
import '../styles/MobileTradingObjective.css'

const MobileTradingObjective: React.FC = () => {
  return (
    <div className="section">
      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
        <i className="fas fa-clipboard-list" style={{color: '#FFD700', fontSize: '16px'}}></i>
        <span className="text-small" style={{textTransform: 'uppercase', fontWeight: '600', color: 'rgba(255,255,255,0.6)'}}>Trading objective</span>
      </div>
      <div className="objectives-list">
        <div className="objective-row">
          <div className="objective-left">
            <span className="objective-icon"><i className="fas fa-circle-exclamation" style={{color: '#FFD700'}}></i></span>
            <span className="objective-text">Max Loss <i className="fas fa-info-circle" style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginLeft: '4px'}} title="Maximum loss allowed per trade"></i></span>
          </div>
          <div className="check-status">
            <i className="fas fa-check-circle checked"></i>
          </div>
        </div>
        <div className="objective-row">
          <div className="objective-left">
            <span className="objective-icon"><i className="fas fa-bullseye"></i></span>
            <span className="objective-text">Profit Target <i className="fas fa-info-circle" style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginLeft: '4px'}} title="Target profit to achieve"></i></span>
          </div>
          <div className="check-status">
            <i className="far fa-circle unchecked"></i>
          </div>
        </div>
        <div className="objective-row">
          <div className="objective-left">
            <span className="objective-icon"><i className="fas fa-hourglass-half" style={{color: '#FFD700'}}></i></span>
            <span className="objective-text">5 mins rule <i className="fas fa-info-circle" style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginLeft: '4px'}} title="Minimum time between trades"></i></span>
          </div>
          <div className="check-status">
            <i className="fas fa-check-circle checked"></i>
          </div>
        </div>
        <div className="objective-row">
          <div className="objective-left">
            <span className="objective-icon"><i className="fas fa-calendar-days"></i></span>
            <span className="objective-text">Min Trading Days <i className="fas fa-info-circle" style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginLeft: '4px'}} title="Minimum number of trading days required"></i></span>
          </div>
          <div className="check-status">
            <i className="far fa-circle unchecked"></i>
          </div>
        </div>
      </div>
      <div style={{marginTop: '12px', height: '2px', width: '60px', background: 'rgba(255,215,0,0.4)', borderRadius: '10px'}}></div>
    </div>
  )
}

export default MobileTradingObjective