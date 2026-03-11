import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/DesktopLoginPage.css'
import DescopeAuthCard from '../components/DescopeAuthCard'

const DesktopRegisterPage: React.FC = () => {
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="hero-section">
          <div className="hero-icon">
            <img src="/mobile-logo.svg" alt="MacheFunded" className="hero-logo" />
          </div>
          <h1 className="hero-title">Create Account</h1>
          <p className="hero-subtitle">Start your journey and join MacheFunded today.</p>
        </div>

        <div className="auth-form">
          <div className="form-content">
            <DescopeAuthCard
              title="Register"
              subtitle="Create your MacheFunded account securely"
            />

            <p className="auth-switch-text">
              Already have an account?{' '}
              <Link to="/login" className="auth-switch-link">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesktopRegisterPage
