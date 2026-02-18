import React from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopCompetitionPage.css'

const DesktopCompetitionPage: React.FC = () => {
  return (
    <div className="competition-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div style={{
        marginLeft: '280px', // Account for sidebar
        padding: '24px',
        paddingTop: '80px', // Add top padding to avoid header overlap
        minHeight: '100vh'
      }}>
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="back-button"
        >
          <i className="fas fa-arrow-left"></i>
          Back to Accounts Overview
        </button>

        {/* Page Header */}
        <div className="page-header">
          <h1>Competition</h1>
          <p>Compete for massive rewards</p>
        </div>

        {/* Competition Content */}
        <div className="competition-content">
          {/* Hero Section */}
          <div className="hero-section">
            <div className="hero-icon">
              <i className="fas fa-trophy"></i>
            </div>
            <h1 className="hero-title">Monthly Competition</h1>
            <p className="hero-subtitle">Compete for massive rewards</p>
          </div>

          {/* Reward Card */}
          <div className="reward-card">
            <div className="card-content">
              <div className="reward-amount">₦10,000,000</div>
              <h2 className="reward-title">Monthly Reward Pool</h2>
              <p className="reward-description">Win up to ₦10 million every month</p>

              {/* Coming Soon Badge */}
              <div className="coming-soon-badge">
                <i className="fas fa-clock"></i>
                <span>Coming Soon</span>
              </div>

              {/* Feature List */}
              <div className="feature-list">
                <div className="feature-item">
                  <i className="fas fa-medal"></i>
                  <span>Top trader rankings</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-chart-line"></i>
                  <span>Performance-based rewards</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-users"></i>
                  <span>Community challenges</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-calendar-alt"></i>
                  <span>Monthly competitions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Card */}
          <div className="notification-card">
            <div className="notification-icon">
              <i className="fas fa-bell"></i>
            </div>
            <div className="notification-content">
              <h3 className="notification-title">Get Notified</h3>
              <p className="notification-description">
                Be the first to know when competitions launch
              </p>
              <button className="notify-button">
                Notify Me When Live
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopCompetitionPage
