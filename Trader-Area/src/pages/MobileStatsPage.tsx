import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileStatsPage.css'

const MobileStatsPage: React.FC = () => {
  const navigate = useNavigate()

  const comingSoonItems = useMemo(() => ([
    'Win rate breakdown from real closed trades',
    'Profit factor and risk-to-reward insights',
    'Sharpe ratio and performance consistency analysis',
    'Most traded symbols and behavioral patterns',
    'Biggest gain/loss review to improve discipline',
    'Actionable coaching insights to help improve your trading',
  ]), [])

  return (
    <div className="mobile-stats-page">
      <div className="mobile-stats-shell">
        <header className="mobile-stats-header">
          <button type="button" className="mobile-stats-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-stats-header__text">
            <h1>Stats</h1>
            <p>Advanced performance analytics</p>
          </div>
          <button type="button" className="mobile-stats-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        <section className="mobile-stats-coming-soon">
          <div className="mobile-stats-coming-soon__badge">
            <i className="fas fa-sparkles" />
            Coming Soon
          </div>
          <h2>Advanced Stats are on the way</h2>
          <p>
            We’re preparing a better stats experience that will show deeper trade analysis and clearer insights
            to help you improve your trading performance.
          </p>

          <div className="mobile-stats-coming-soon__list">
            {comingSoonItems.map((item) => (
              <div key={item} className="mobile-stats-coming-soon__item">
                <span>
                  <i className="fas fa-check" />
                </span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>

          <div className="mobile-stats-coming-soon__footer">
            Once ready, this page will help traders understand strengths, weaknesses, and where to adjust
            risk, entries, and execution.
          </div>
        </section>
      </div>
    </div>
  )
}

export default MobileStatsPage