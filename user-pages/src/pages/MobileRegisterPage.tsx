import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/MobileAuthPage.css'
import DescopeAuthCard from '../components/DescopeAuthCard'

const MobileRegisterPage: React.FC = () => {
  return (
    <div className="mobile-auth-page mobile-auth-page-dark">
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
            title="Register"
            subtitle="Create your NairaTrader account securely"
          />

          <p className="mobile-auth-switch">
            Already have an account?{' '}
            <Link to="/login" className="mobile-auth-switch-link">Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default MobileRegisterPage
