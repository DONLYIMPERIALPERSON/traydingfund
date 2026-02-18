import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileCompetitionPage.css'

const MobileCompetitionPage: React.FC = () => {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="mobile-competition-page">
      <div className="mobile-competition-fixed-header">
        <div className="mobile-competition-header-shell">
          <div className="mobile-competition-header-row">
            <div className="mobile-competition-header-left">
              <div className="mobile-competition-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-competition-header-center">
              <span className="mobile-competition-header-title">Competition</span>
            </div>
            <div className="mobile-competition-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-competition-content-container">
        <div className="mobile-competition-content-padding">
          {/* Hero Section */}
          <div style={{textAlign: 'center', marginBottom: '24px'}}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)'
            }}>
              <i className="fas fa-trophy" style={{fontSize: '32px', color: '#000'}}></i>
            </div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#FFD700',
              marginBottom: '8px',
              textShadow: '0 2px 4px rgba(255, 215, 0, 0.3)'
            }}>
              Monthly Competition
            </h1>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '0'
            }}>
              Compete for massive rewards
            </p>
          </div>

          {/* Reward Card */}
          <div className="mobile-competition-card" style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,215,0,0.05) 100%)',
            border: '1px solid rgba(255,215,0,0.2)',
            marginBottom: '24px'
          }}>
            <div className="mobile-competition-card-inner" style={{textAlign: 'center', padding: '32px 20px'}}>
              <div style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#FFD700',
                marginBottom: '12px',
                textShadow: '0 2px 8px rgba(255, 215, 0, 0.5)'
              }}>
                ₦10,000,000
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px'
              }}>
                Monthly Reward Pool
              </div>
              <div style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '20px'
              }}>
                Win up to ₦10 million every month
              </div>

              {/* Coming Soon Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '20px',
                padding: '8px 16px',
                marginBottom: '20px'
              }}>
                <i className="fas fa-clock" style={{color: '#FFD700'}}></i>
                <span style={{fontSize: '14px', fontWeight: '600', color: 'white'}}>
                  Coming Soon
                </span>
              </div>

              {/* Feature List */}
              <div style={{textAlign: 'left', maxWidth: '280px', margin: '0 auto'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
                  <i className="fas fa-medal" style={{color: '#FFD700', width: '16px'}}></i>
                  <span style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)'}}>
                    Top trader rankings
                  </span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
                  <i className="fas fa-chart-line" style={{color: '#FFD700', width: '16px'}}></i>
                  <span style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)'}}>
                    Performance-based rewards
                  </span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
                  <i className="fas fa-users" style={{color: '#FFD700', width: '16px'}}></i>
                  <span style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)'}}>
                    Community challenges
                  </span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <i className="fas fa-calendar-alt" style={{color: '#FFD700', width: '16px'}}></i>
                  <span style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)'}}>
                    Monthly competitions
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Card */}
          <div className="mobile-competition-card" style={{background: 'rgba(255,255,255,0.05)'}}>
            <div className="mobile-competition-card-inner" style={{textAlign: 'center', padding: '24px 20px'}}>
              <i className="fas fa-bell" style={{
                fontSize: '24px',
                color: '#FFD700',
                marginBottom: '12px'
              }}></i>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px'
              }}>
                Get Notified
              </div>
              <div style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '16px'
              }}>
                Be the first to know when competitions launch
              </div>
              <button style={{
                background: 'rgba(255,215,0,0.8)',
                color: 'black',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%'
              }}>
                Notify Me When Live
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileCompetitionPage