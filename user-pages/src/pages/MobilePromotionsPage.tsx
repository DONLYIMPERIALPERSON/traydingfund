import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobilePromotionsPage.css'

const MobilePromotionsPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'giveaway' | 'discount'>('giveaway')

  const handleBack = () => {
    navigate(-1)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://nairatrader.com/giveaway/400k')
    // You could add a toast notification here
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText('CEO')
    // You could add a toast notification here
  }

  return (
    <div className="mobile-promotions-page">
      <div className="mobile-promotions-fixed-header">
        <div className="mobile-promotions-header-shell">
          <div className="mobile-promotions-header-row">
            <div className="mobile-promotions-header-left">
              <div className="mobile-promotions-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-promotions-header-center">
              <span className="mobile-promotions-header-title">Promotions</span>
            </div>
            <div className="mobile-promotions-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-promotions-content-container">
        <div className="mobile-promotions-content-padding">
          {/* Description */}
          <div className="mobile-promotions-description-wrap">
            <p className="mobile-promotions-description">
              Giveaways, discount codes, and links in one place.
            </p>
          </div>

          {/* Tabs */}
          <div className="mobile-promotions-tabs">
            <button
              onClick={() => setActiveTab('giveaway')}
              className={`mobile-promotions-tab-button ${activeTab === 'giveaway' ? 'active' : ''}`}
            >
              Giveaway
            </button>
            <button
              onClick={() => setActiveTab('discount')}
              className={`mobile-promotions-tab-button ${activeTab === 'discount' ? 'active' : ''}`}
            >
              Discount
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'giveaway' && (
            <div className="mobile-promotions-card">
              <div className="mobile-promotions-card-inner">
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px'}}>Giveaways</h3>

                <div style={{padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '16px'}}>
                  <h4 style={{fontSize: '16px', fontWeight: '600', color: '#FFD700', marginBottom: '12px'}}>
                    ₦400k Free Account for 100 Traders
                  </h4>

                  <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '16px', lineHeight: '1.5'}}>
                    31:38:52
                  </div>

                  <div style={{fontSize: '14px', color: 'white', marginBottom: '16px', lineHeight: '1.5'}}>
                    Like, Share, Repost and Tag 5 of your friends on X (Twitter) platform. Click on the button below to participate.
                  </div>

                  <div style={{display: 'flex', gap: '12px'}}>
                    <button
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: 'rgba(255,215,0,0.8)',
                        color: 'black',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Open Twitter
                    </button>
                    <button
                      onClick={handleCopyLink}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Copy link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'discount' && (
            <div className="mobile-promotions-card">
              <div className="mobile-promotions-card-inner">
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px'}}>Discount Codes</h3>

                <div style={{padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <div style={{fontSize: '16px', fontWeight: '600', color: 'white'}}>Code: CEO</div>
                    <div style={{fontSize: '14px', fontWeight: '600', color: '#FFD700'}}>5% OFF</div>
                  </div>

                  <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px'}}>
                    Expiry: No expiry
                  </div>

                  <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px'}}>
                    Usage: 225 / Unlimited
                  </div>

                  <button
                    onClick={handleCopyCode}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255,215,0,0.8)',
                      color: 'black',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Copy code
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MobilePromotionsPage