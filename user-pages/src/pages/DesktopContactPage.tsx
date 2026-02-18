import React from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopContactPage.css'

const DesktopContactPage: React.FC = () => {
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const handleWhatsApp = (phone: string) => {
    window.location.href = `https://wa.me/${phone}`
  }

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const socialLinks = [
    { name: 'Discord', icon: 'fab fa-discord', color: '#5865F2', url: 'https://discord.com/invite/WyPx9cm7R7' },
    { name: 'Telegram', icon: 'fab fa-telegram', color: '#0088CC', url: 'https://t.me/nairatrader' },
    { name: 'TikTok', icon: 'fab fa-tiktok', color: '#000000', url: 'https://www.tiktok.com/@nairatrader_FX' },
    { name: 'X', icon: 'fab fa-x-twitter', color: '#000000', url: 'https://x.com/naira_trader' }
  ]

  return (
    <div className="contact-page">
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
          <h1>Contact</h1>
          <p>Get in touch with our team</p>
        </div>

        {/* Contact Content */}
        <div className="contact-content">
          {/* Head Office */}
          <div className="contact-card">
            <div className="card-header">
              <i className="fas fa-building"></i>
              <h3>Head Office</h3>
            </div>
            <div className="card-content">
              <div className="location-info">
                <i className="fas fa-map-marker-alt"></i>
                <div>
                  <div className="location-title">Location</div>
                  <div className="location-address">2, Akin Osiyemi, Allen Avenue.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Phone Numbers */}
          <div className="contact-card">
            <div className="card-header">
              <i className="fas fa-phone"></i>
              <h3>Phone Numbers</h3>
            </div>
            <div className="card-content">
              {/* Calls Only */}
              <div className="phone-section">
                <div className="phone-label">CALLS ONLY</div>
                <button
                  onClick={() => handleCall('08021495027')}
                  className="phone-button calls"
                >
                  <span>08021495027</span>
                  <i className="fas fa-phone"></i>
                </button>
              </div>

              {/* WhatsApp Only */}
              <div className="phone-section">
                <div className="phone-label">WHATSAPP ONLY</div>
                <button
                  onClick={() => handleWhatsApp('09040001503')}
                  className="phone-button whatsapp"
                >
                  <span>09040001503</span>
                  <i className="fab fa-whatsapp"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Community */}
          <div className="contact-card">
            <div className="card-header">
              <i className="fas fa-users"></i>
              <h3>Join Our Live Community</h3>
            </div>
            <div className="card-content">
              <div className="social-links">
                {socialLinks.map((social) => (
                  <button
                    key={social.name}
                    className="social-button"
                    onClick={() => handleOpenLink(social.url)}
                  >
                    <i className={social.icon} style={{color: social.color}}></i>
                    <span>{social.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className="contact-card">
            <div className="card-header">
              <i className="fas fa-clock"></i>
              <h3>Working Hours</h3>
            </div>
            <div className="card-content">
              <div className="hours-info">
                <i className="fas fa-calendar-week"></i>
                <div>
                  <div className="hours-time">9am to 5pm</div>
                  <div className="hours-days">Mondays to Fridays Only</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopContactPage
