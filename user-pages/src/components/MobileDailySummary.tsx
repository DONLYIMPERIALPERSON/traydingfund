import React from 'react'
import '../styles/MobileDailySummary.css'

const MobileDailySummary: React.FC = () => {
  return (
    <div className="section">
      <div className="daily-summary-title">
        <i className="fas fa-calendar-lines" style={{color: '#FFD700', fontSize: '18px'}}></i>
        <span className="text-small" style={{color: 'rgba(255,255,255,0.7)'}}>Daily Summary</span>
      </div>

      <div className="summary-header">
        <span>Date</span>
        <span>Trades</span>
        <span>Lots</span>
        <span>Result</span>
      </div>

      <div className="summary-list">
        <div className="summary-row">
          <span className="row-date">Mon 10 Feb</span>
          <span className="row-trades">3</span>
          <span className="row-lots">0.45</span>
          <span className="row-result"><span className="profit-badge"><i className="fas fa-plus-circle icon-result"></i> +$240</span></span>
        </div>
        <div className="summary-row">
          <span className="row-date">Tue 11 Feb</span>
          <span className="row-trades">5</span>
          <span className="row-lots">0.92</span>
          <span className="row-result"><span className="loss-badge"><i className="fas fa-minus-circle icon-result"></i> -$127</span></span>
        </div>
        <div className="summary-row">
          <span className="row-date">Wed 12 Feb</span>
          <span className="row-trades">2</span>
          <span className="row-lots">0.30</span>
          <span className="row-result"><span className="profit-badge"><i className="fas fa-plus-circle"></i> +$89</span></span>
        </div>
        <div className="summary-row">
          <span className="row-date">Thu 13 Feb</span>
          <span className="row-trades">4</span>
          <span className="row-lots">0.78</span>
          <span className="row-result"><span className="neutral-badge"><i className="fas fa-minus"></i> $0.00</span></span>
        </div>
      </div>

      <div style={{marginTop: '18px', display: 'flex', justifyContent: 'flex-end'}}>
        <span style={{fontSize: '12px', color: 'rgba(255,215,0,0.7)'}}><i className="fas fa-regular fa-circle"></i> last 4 trading days</span>
      </div>
    </div>
  )
}

export default MobileDailySummary