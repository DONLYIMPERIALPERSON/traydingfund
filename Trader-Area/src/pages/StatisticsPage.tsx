import React, { useMemo } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopStatisticsPage.css'

const StatisticsPage: React.FC = () => {
  const comingSoonItems = useMemo(() => ([
    'Win rate breakdown from real closed trades',
    'Profit factor and risk-to-reward insights',
    'Sharpe ratio and performance consistency analysis',
    'Most traded symbols and behavioral patterns',
    'Biggest gain/loss review to improve discipline',
    'Actionable coaching insights to help improve your trading',
  ]), [])

  return (
    <div className="desktop-statistics-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="statistics-content">
        <div className="back-button">
          <button onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left"></i>
            Back to Accounts Overview
          </button>
        </div>

        <section className="desktop-stats-coming-soon">
          <div className="desktop-stats-coming-soon__badge">
            <i className="fas fa-sparkles" />
            Coming Soon
          </div>
          <h1>Advanced Stats are on the way</h1>
          <p>
            We’re preparing a better stats experience that will show deeper trade analysis, stronger performance
            insights, and clearer coaching signals to help improve your trading decisions.
          </p>

          <div className="desktop-stats-coming-soon__list">
            {comingSoonItems.map((item) => (
              <div key={item} className="desktop-stats-coming-soon__item">
                <span>
                  <i className="fas fa-check" />
                </span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>

          <div className="desktop-stats-coming-soon__footer">
            Once ready, this page will help traders understand strengths, weaknesses, and where to adjust risk,
            entries, and execution.
          </div>
        </section>
      </div>

      <DesktopFooter />
    </div>
  )
}

export default StatisticsPage