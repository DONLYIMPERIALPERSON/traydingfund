import React from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopAccountOverviewPage.css'

const DesktopAccountOverviewPage: React.FC = () => {
  return (
    <div className="account-overview-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="account-overview-content">
        {/* Back Button */}
        <div className="back-button">
          <button onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left"></i>
            Back to Accounts Overview
          </button>
        </div>

        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <h1>Account Overview</h1>
            <p>Detailed metrics and performance data for your trading account</p>
          </div>
          <button className="refresh-button">
            <i className="fas fa-sync-alt"></i>
            Refresh
          </button>
        </div>

        {/* Balance Overview Section */}
        <div className="balance-overview-section">
          <div className="balance-overview-header">
            <span className="balance-overview-title">Balance Overview</span>
            <span className="connection-status">Connected</span>
          </div>
          <div className="balance-grid">
            <div className="balance-card">
              <div className="balance-card-header">
                <i className="fas fa-wallet"></i>
                Balance
              </div>
              <div className="balance-value">N100,000</div>
            </div>
            <div className="balance-card">
              <div className="balance-card-header">
                <i className="fas fa-chart-line"></i>
                Equity
              </div>
              <div className="balance-value">N100,000</div>
            </div>
            <div className="balance-card">
              <div className="balance-card-header">
                <i className="fas fa-chart-simple"></i>
                Unrealized PnL
              </div>
              <div className="balance-value">N0.00</div>
            </div>
            <div className="balance-card today-profit">
              <div className="balance-card-header">
                <i className="fas fa-sun"></i>
                Today's Profit
              </div>
              <div className="balance-value">N0.00</div>
            </div>
          </div>
        </div>

        {/* Analysis Section */}
        <div className="analysis-section">
          <span className="analysis-title">Analysis</span>
          <div className="analysis-grid">
            <div className="analysis-card">
              <div className="analysis-card-header">
                <i className="fas fa-arrow-trend-up"></i>
                <span className="analysis-card-title">Total P/L</span>
              </div>
              <div className="analysis-value">N0.00</div>
              <div className="analysis-subtitle">Lifetime Profit</div>
            </div>
            <div className="analysis-card">
              <div className="analysis-card-header">
                <i className="fas fa-flag-checkered"></i>
                <span className="analysis-card-title">Max P/L</span>
              </div>
              <div className="analysis-value">N0.00</div>
              <div className="analysis-subtitle">Peak to Valley</div>
            </div>
          </div>
        </div>

        {/* Trading Objective Section */}
        <div className="trading-objective-section">
          <div className="trading-objective-header">
            <i className="fas fa-clipboard-list"></i>
            <span className="trading-objective-title">Trading Objective</span>
          </div>
          <div className="objectives-list">
            <div className="objective-item">
              <div className="objective-content">
                <i className="fas fa-circle-exclamation objective-icon max-loss"></i>
                <span className="objective-text">Max Loss</span>
                <i className="fas fa-info-circle objective-info" title="Maximum loss allowed per trade"></i>
              </div>
              <i className="fas fa-check-circle objective-status completed"></i>
            </div>
            <div className="objective-item">
              <div className="objective-content">
                <i className="fas fa-bullseye objective-icon profit-target"></i>
                <span className="objective-text">Profit Target</span>
                <i className="fas fa-info-circle objective-info" title="Target profit to achieve"></i>
              </div>
              <i className="far fa-circle objective-status pending"></i>
            </div>
            <div className="objective-item">
              <div className="objective-content">
                <i className="fas fa-hourglass-half objective-icon time-rule"></i>
                <span className="objective-text">5 mins rule</span>
                <i className="fas fa-info-circle objective-info" title="Minimum time between trades"></i>
              </div>
              <i className="fas fa-check-circle objective-status completed"></i>
            </div>
            <div className="objective-item">
              <div className="objective-content">
                <i className="fas fa-calendar-days objective-icon trading-days"></i>
                <span className="objective-text">Min Trading Days</span>
                <i className="fas fa-info-circle objective-info" title="Minimum number of trading days required"></i>
              </div>
              <i className="far fa-circle objective-status pending"></i>
            </div>
          </div>
          <div className="objective-progress-bar"></div>
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopAccountOverviewPage