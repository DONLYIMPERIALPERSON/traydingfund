import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/MobileAuthPage.css'

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
          <label className="mobile-auth-label">First Name</label>
          <div className="mobile-auth-input-wrap">
            <i className="fas fa-user" />
            <input type="text" placeholder="First name" />
          </div>

          <label className="mobile-auth-label">Last Name</label>
          <div className="mobile-auth-input-wrap">
            <i className="fas fa-user" />
            <input type="text" placeholder="Last name" />
          </div>

          <label className="mobile-auth-label">Email</label>
          <div className="mobile-auth-input-wrap">
            <i className="fas fa-envelope" />
            <input type="email" placeholder="Enter your email" />
          </div>

          <label className="mobile-auth-label">Password</label>
          <div className="mobile-auth-input-wrap">
            <i className="fas fa-lock" />
            <input type="password" placeholder="Create password" />
          </div>

          <label className="mobile-auth-checkbox mobile-auth-terms">
            <input type="checkbox" /> I agree to Terms and Conditions
          </label>

          <button className="mobile-auth-primary" type="button">Create Account</button>

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
