import React from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopLeaderboardPage.css'

const LeaderboardPage: React.FC = () => {
  return (
    <div className="leaderboard-page">
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
          <h1>Leaderboard</h1>
          <p>Compete with the best traders</p>
        </div>

        {/* Leaderboard Content */}
        <div className="leaderboard-content">
          {/* Coming Soon Card */}
          <div className="coming-soon-card">
            <div className="card-header">
              <div className="card-icon">
                <i className="fas fa-list-ol"></i>
              </div>
              <h2 className="card-title">Coming Soon</h2>
            </div>

            <div className="card-content">
              <p className="card-description">
                Track your ranking among top traders and see how you stack up against the competition.
              </p>

              {/* Coming Soon Badge */}
              <div className="coming-soon-badge">
                <i className="fas fa-clock"></i>
                <span>Feature in Development</span>
              </div>

              {/* Feature Preview */}
              <div className="feature-preview">
                <div className="feature-item">
                  <i className="fas fa-medal"></i>
                  <span>Real-time rankings</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-chart-line"></i>
                  <span>Performance metrics</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-users"></i>
                  <span>Community standings</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-calendar-week"></i>
                  <span>Weekly competitions</span>
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
                Be the first to know when leaderboards go live
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

export default LeaderboardPage
