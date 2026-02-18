import React from 'react'
import { useNavigate } from 'react-router-dom'
import MobileAccountTypes from '../components/MobileAccountTypes'
import '../styles/MobileTradingAccountsPage.css'

const MobileTradingAccountsPage: React.FC = () => {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="mobile-trading-accounts-page">
      <div className="mobile-trading-fixed-header">
        <div className="mobile-trading-header-shell">
          <div className="mobile-trading-header-row">
            <div className="mobile-trading-header-left">
              <div className="mobile-trading-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-trading-header-center">
              <span className="mobile-trading-header-title">Trading Accounts</span>
            </div>
            <div className="mobile-trading-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-trading-content-container">
        <MobileAccountTypes />
      </div>
    </div>
  )
}

export default MobileTradingAccountsPage