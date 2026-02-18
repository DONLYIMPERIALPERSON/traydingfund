import React, { useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopPromotionsPage.css'

const DesktopPromotionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'giveaway' | 'discount'>('giveaway')

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://nairatrader.com/giveaway/400k')
    // You could add a toast notification here
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText('CEO')
    // You could add a toast notification here
  }

  return (
    <div className="promotions-page">
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
          <h1>Promotions</h1>
          <p>Giveaways, discount codes, and links in one place</p>
        </div>

        {/* Promotions Content */}
        <div className="promotions-content">
          {/* Tabs */}
          <div className="tabs-container">
            <button
              onClick={() => setActiveTab('giveaway')}
              className={`tab-button ${activeTab === 'giveaway' ? 'active' : ''}`}
            >
              Giveaway
            </button>
            <button
              onClick={() => setActiveTab('discount')}
              className={`tab-button ${activeTab === 'discount' ? 'active' : ''}`}
            >
              Discount
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'giveaway' && (
            <div className="tab-content">
              <h3 className="tab-title">Giveaways</h3>

              <div className="giveaway-card">
                <h4 className="giveaway-title">₦400k Free Account for 100 Traders</h4>

                <div className="giveaway-timer">31:38:52</div>

                <p className="giveaway-description">
                  Like, Share, Repost and Tag 5 of your friends on X (Twitter) platform. Click on the button below to participate.
                </p>

                <div className="giveaway-actions">
                  <button className="primary-button">
                    Open Twitter
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="secondary-button"
                  >
                    Copy link
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'discount' && (
            <div className="tab-content">
              <h3 className="tab-title">Discount Codes</h3>

              <div className="discount-card">
                <div className="discount-header">
                  <div className="discount-code">Code: CEO</div>
                  <div className="discount-amount">5% OFF</div>
                </div>

                <div className="discount-details">
                  <div className="discount-expiry">Expiry: No expiry</div>
                  <div className="discount-usage">Usage: 225 / Unlimited</div>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="copy-button"
                >
                  Copy code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopPromotionsPage
