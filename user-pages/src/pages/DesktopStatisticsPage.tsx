import React from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopStatisticsPage.css'

const DesktopStatisticsPage: React.FC = () => {
  return (
    <div className="desktop-statistics-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="statistics-content">
        {/* Back Button */}
        <div className="back-button">
          <button onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left"></i>
            Back to Accounts Overview
          </button>
        </div>

        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Statistics</h1>
            <p>Performance analysis and trading statistics for your account</p>
          </div>
          <button className="refresh-button" onClick={() => window.location.reload()}>
            <i className="fas fa-sync-alt"></i>
            Refresh
          </button>
        </div>

        {/* Performance Section */}
        <div className="performance-section">
          <div className="performance-header">
            <div className="performance-header-left">
              <i className="fas fa-chart-pie"></i>
              <span className="performance-title">Performance</span>
            </div>
            <span className="time-period">this month</span>
          </div>
          <div className="performance-grid">
            <div className="performance-card">
              <div className="card-header">
                <i className="fas fa-trophy"></i>
                Win Rate
              </div>
              <div className="card-value">
                78<span className="percentage">%</span>
              </div>
              <div className="card-change">
                <i className="fas fa-arrow-up"></i>
                +12% vs last month
              </div>
            </div>
            <div className="performance-card">
              <div className="card-header">
                <i className="fas fa-arrow-right-arrow-left"></i>
                No. of trades
              </div>
              <div className="card-value">143</div>
              <div className="card-change neutral">
                <i className="fas fa-clock"></i>
                since 1 Jan
              </div>
            </div>
          </div>
        </div>

        {/* Daily Summary Section */}
        <div className="daily-summary-section">
          <div className="daily-summary-header">
            <i className="fas fa-calendar-lines"></i>
            <span className="daily-summary-title">Daily Summary</span>
          </div>

          {/* Table Header */}
          <div className="table-header">
            <span>Date</span>
            <span>Trades</span>
            <span>Lots</span>
            <span>Result</span>
          </div>

          {/* Table Rows */}
          <div className="table-rows">
            <div className="table-row">
              <span className="table-cell">Mon 10 Feb</span>
              <span className="table-cell">3</span>
              <span className="table-cell">0.45</span>
              <span className="result-cell positive">
                <i className="fas fa-plus-circle"></i>
                +$240
              </span>
            </div>
            <div className="table-row">
              <span className="table-cell">Tue 11 Feb</span>
              <span className="table-cell">5</span>
              <span className="table-cell">0.92</span>
              <span className="result-cell negative">
                <i className="fas fa-minus-circle"></i>
                -$127
              </span>
            </div>
            <div className="table-row">
              <span className="table-cell">Wed 12 Feb</span>
              <span className="table-cell">2</span>
              <span className="table-cell">0.30</span>
              <span className="result-cell positive">
                <i className="fas fa-plus-circle"></i>
                +$89
              </span>
            </div>
            <div className="table-row">
              <span className="table-cell">Thu 13 Feb</span>
              <span className="table-cell">4</span>
              <span className="table-cell">0.78</span>
              <span className="result-cell neutral">
                <i className="fas fa-minus"></i>
                $0.00
              </span>
            </div>
          </div>

          <div className="table-footer">
            <span>
              <i className="fas fa-regular fa-circle"></i> last 4 trading days
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopStatisticsPage