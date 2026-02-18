import React, { useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopCredentialsPage.css'

const DesktopCredentialsPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showInvestorPassword, setShowInvestorPassword] = useState(false)

  return (
    <div className="desktop-credentials-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="credentials-content">
        {/* Back Button */}
        <div className="back-button">
          <button onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left"></i>
            Back to Accounts Overview
          </button>
        </div>

        {/* Page Header */}
        <div className="page-header">
          <h1>Account Credentials</h1>
          <p>Secure login information for your trading account</p>
        </div>

        {/* Credentials Header */}
        <div className="credentials-header">
          <div className="credentials-header-content">
            <div className="credentials-header-left">
              <i className="fas fa-lock"></i>
              <span className="credentials-header-title">Login Credentials</span>
            </div>
            <div className="encrypted-badge">
              <i className="fas fa-shield"></i>
              Encrypted
            </div>
          </div>
        </div>

        {/* Credentials List */}
        <div className="credentials-list">
          {/* Server */}
          <div className="credential-card">
            <div className="credential-content">
              <div className="credential-info">
                <div className="credential-icon server-icon">
                  <i className="fas fa-server"></i>
                </div>
                <div className="credential-details">
                  <div className="credential-label">Server</div>
                  <div className="credential-value">ICMarkets-Live06</div>
                </div>
              </div>
              <button
                className="action-button"
                onClick={() => navigator.clipboard.writeText('ICMarkets-Live06')}
              >
                <i className="fas fa-copy"></i>
                Copy
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="credential-card">
            <div className="credential-content">
              <div className="credential-info">
                <div className="credential-icon password-icon">
                  <i className="fas fa-key"></i>
                </div>
                <div className="credential-details">
                  <div className="credential-label">Password</div>
                  <div className="credential-value">
                    {showPassword ? 'mypassword123' : '••••••••••••'}
                  </div>
                </div>
              </div>
              <button
                className="action-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Account Number */}
          <div className="credential-card">
            <div className="credential-content">
              <div className="credential-info">
                <div className="credential-icon account-icon">
                  <i className="fas fa-hashtag"></i>
                </div>
                <div className="credential-details">
                  <div className="credential-label">Account Number</div>
                  <div className="credential-value">81054239</div>
                </div>
              </div>
              <button
                className="action-button"
                onClick={() => navigator.clipboard.writeText('81054239')}
              >
                <i className="fas fa-copy"></i>
                Copy
              </button>
            </div>
          </div>

          {/* Investor Password */}
          <div className="credential-card">
            <div className="credential-content">
              <div className="credential-info">
                <div className="credential-icon investor-icon">
                  <i className="fas fa-lock"></i>
                </div>
                <div className="credential-details">
                  <div className="credential-label">Investor Password</div>
                  <div className="credential-value">
                    {showInvestorPassword ? 'investorpass' : '••••••••'}
                  </div>
                </div>
              </div>
              <button
                className="action-button"
                onClick={() => setShowInvestorPassword(!showInvestorPassword)}
              >
                <i className={`fas fa-${showInvestorPassword ? 'eye-slash' : 'eye'}`}></i>
                {showInvestorPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="info-note">
          <div className="info-note-content">
            <i className="fas fa-info-circle"></i>
            <span>Investor password – read only access for monitoring</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopCredentialsPage