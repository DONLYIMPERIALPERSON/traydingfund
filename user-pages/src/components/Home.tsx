import React from 'react'
import '../styles/Home.css'
import BottomNav from './BottomNav'

const Home: React.FC = () => {
  return (
    <div className="body">
      <div className="ios-card">
        {/* Home Header */}
        <div className="section">
          <div className="home-header-row">
            <div className="accounts-left">
              <div className="accounts-badge">
                <i className="fas fa-wallet"></i>
                <span>Accounts</span>
              </div>
            </div>
            <div className="pulse-notification-group">
              <div className="pulse-icon">
                <i className="fas fa-chart-pulse"></i>
                <span className="pulse-dot"></span>
              </div>
              <div className="notification-icon">
                <i className="fas fa-bell"></i>
                <span className="notification-badge">3</span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Account */}
        <div className="section">
          <div className="primary-account-card">
            <div className="account-header-row">
              <div className="account-status">
                <span className="status-badge">
                  <i className="fas fa-check-circle"></i> Active
                </span>
              </div>
              <span className="account-number">
                <i className="fas fa-hashtag" style={{color: '#FFD700', fontSize: '12px'}}></i> 81054239
              </span>
            </div>
            <div className="account-balance-large">
              <span className="balance-label">Balance</span>
              <span className="balance-amount">N100,000</span>
              <span className="balance-currency">NGN</span>
            </div>
            <div style={{marginTop: '12px', display: 'flex', gap: '16px'}}>
              <span style={{fontSize: '13px', color: 'rgba(255,255,255,0.5)'}}><i className="fas fa-chart-line" style={{color: '#FFD700'}}></i> Equity N100,000</span>
              <span style={{fontSize: '13px', color: 'rgba(255,255,255,0.5)'}}><i className="fas fa-arrow-trend-up"></i> P/L N0.00</span>
            </div>
          </div>
        </div>

        {/* Hidden Accounts */}
        <div className="section hidden-accounts-section">
          <input type="checkbox" id="toggle-hidden" style={{display: 'none'}} />
          <label htmlFor="toggle-hidden" className="hidden-accounts-trigger">
            <div className="trigger-left">
              <i className="fas fa-eye-slash"></i>
              <span>Hidden accounts</span>
            </div>
            <div className="trigger-right">
              <span className="hidden-count">2</span>
              <i className="fas fa-chevron-down"></i>
            </div>
          </label>
          <div className="hidden-accounts-list">
            <div className="hidden-account-item">
              <div className="hidden-account-info">
                <div className="hidden-account-title">
                  <span className="hidden-account-status"><i className="fas fa-circle" style={{fontSize: '8px'}}></i> Demo</span>
                  <span className="hidden-account-number"># 42719035</span>
                </div>
                <div>
                  <span className="hidden-account-balance">N25,000</span>
                  <span className="hidden-account-currency">NGN</span>
                </div>
              </div>
            </div>
            <div className="hidden-account-item">
              <div className="hidden-account-info">
                <div className="hidden-account-title">
                  <span className="hidden-account-status"><i className="fas fa-circle" style={{color: '#FFD700', fontSize: '8px'}}></i> Standard</span>
                  <span className="hidden-account-number"># 67289451</span>
                </div>
                <div>
                  <span className="hidden-account-balance">N50,000</span>
                  <span className="hidden-account-currency">NGN</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <BottomNav />

        <div style={{marginTop: '16px', height: '2px', width: '70px', background: 'rgba(255,215,0,0.3)', borderRadius: '10px'}}></div>
      </div>
    </div>
  )
}

export default Home