import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/MobileAuthPage.css'

const MobileLoginPage: React.FC = () => {
  const navigate = useNavigate()

  const handleLogin = () => {
    navigate('/')
  }

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
          <label className="mobile-auth-label">Email</label>
          <div className="mobile-auth-input-wrap">
            <i className="fas fa-envelope" />
            <input type="email" placeholder="Enter your email" />
          </div>

          <label className="mobile-auth-label">Password</label>
          <div className="mobile-auth-input-wrap">
            <i className="fas fa-lock" />
            <input type="password" placeholder="Enter your password" />
          </div>

          <div className="mobile-auth-row">
            <label className="mobile-auth-checkbox">
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" className="mobile-auth-link">Forgot?</a>
          </div>

          <button className="mobile-auth-primary" type="button" onClick={handleLogin}>Login</button>

          <p className="mobile-auth-switch">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="mobile-auth-switch-link">Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default MobileLoginPage
