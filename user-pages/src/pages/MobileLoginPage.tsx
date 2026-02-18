import React from 'react'
import '../styles/MobileAuthPage.css'
import DescopeAuthCard from '../components/DescopeAuthCard'

const MobileLoginPage: React.FC = () => {
  return (
    <div className="mobile-auth-page mobile-auth-page-dark mobile-auth-login-only-theme">
      <div className="mobile-auth-top-logo-wrap">
        <img src="/mobile-logo.svg" alt="NairaTrader" className="mobile-auth-top-logo" />
      </div>

      <div className="mobile-auth-card mobile-auth-card-dark">
        <div className="mobile-auth-hero">
          <h1 className="mobile-auth-title">Secured Area</h1>
          <p className="mobile-auth-subtitle">Login or create an account</p>
        </div>

        <div className="mobile-auth-form">
          <DescopeAuthCard
            title="Login"
            subtitle="Continue securely with your NairaTrader account"
          />
        </div>
      </div>
    </div>
  )
}

export default MobileLoginPage
