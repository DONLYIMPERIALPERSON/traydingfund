import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/DesktopLoginPage.css'

const DesktopRegisterPage: React.FC = () => {
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="hero-section">
          <div className="hero-icon">
            <img src="/mobile-logo.svg" alt="NairaTrader" className="hero-logo" />
          </div>
          <h1 className="hero-title">Create Account</h1>
          <p className="hero-subtitle">Start your journey and join NairaTrader today.</p>
        </div>

        <div className="auth-form">
          <div className="form-content">
            <h2 className="form-title">Register</h2>

            <div className="name-fields">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <div className="input-group">
                  <i className="fas fa-user input-icon" />
                  <input className="form-input" type="text" placeholder="First name" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <div className="input-group">
                  <i className="fas fa-user input-icon" />
                  <input className="form-input" type="text" placeholder="Last name" />
                </div>
              </div>
            </div>

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
                <input className="form-input" type="password" placeholder="Create password" />
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label terms">
                <input className="checkbox-input" type="checkbox" />
                <span className="checkmark" />
                I agree to the <a className="terms-link" href="#">Terms and Conditions</a>
              </label>
            </div>

            <button className="submit-button" type="button">Create Account</button>

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
