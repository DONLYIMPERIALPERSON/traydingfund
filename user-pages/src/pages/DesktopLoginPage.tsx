import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/DesktopLoginPage.css'

const DesktopLoginPage: React.FC = () => {
  const navigate = useNavigate()

  const handleLogin = () => {
    navigate('/')
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="hero-section">
          <div className="hero-icon">
            <img src="/mobile-logo.svg" alt="NairaTrader" className="hero-logo" />
          </div>
          <h1 className="hero-title">Welcome Back</h1>
          <p className="hero-subtitle">Sign in to continue your trading journey.</p>
        </div>

        <div className="auth-form">
          <div className="form-content">
            <h2 className="form-title">Login</h2>

            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-group">
                <i className="fas fa-envelope input-icon" />
                <input className="form-input" type="email" placeholder="Enter your email" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-group">
                <i className="fas fa-lock input-icon" />
                <input className="form-input" type="password" placeholder="Enter your password" />
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input className="checkbox-input" type="checkbox" />
                <span className="checkmark" />
                Remember me
              </label>
              <a className="forgot-link" href="#">Forgot password?</a>
            </div>

            <button className="submit-button" type="button" onClick={handleLogin}>Login</button>

            <p className="auth-switch-text">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="auth-switch-link">Register</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesktopLoginPage
