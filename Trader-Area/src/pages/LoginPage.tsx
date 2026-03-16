import React from 'react'
import '../styles/DesktopLoginPage.css'
import DescopeAuthCard from '../components/DescopeAuthCard'

const LoginPage: React.FC = () => {
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="hero-section">
          <div className="hero-icon">
            <img src="/mobile-logo.svg" alt="MacheFunded" className="hero-logo" />
          </div>
          <h1 className="hero-title">Welcome Back</h1>
          <p className="hero-subtitle">Sign in to continue your trading journey.</p>
        </div>

        <div className="auth-form">
          <div className="form-content">
            <DescopeAuthCard
              title=""
              subtitle=""
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
