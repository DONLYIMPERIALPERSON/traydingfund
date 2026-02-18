import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileContactPage.css'

const MobileContactPage: React.FC = () => {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(-1)
  }

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
    <div className="mobile-contact-page">
      <div className="mobile-contact-fixed-header">
        <div className="mobile-contact-header-shell">
          <div className="mobile-contact-header-row">
            <div className="mobile-contact-header-left">
              <div className="mobile-contact-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-contact-header-center">
              <span className="mobile-contact-header-title">Contact</span>
            </div>
            <div className="mobile-contact-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-contact-content-container">
        <div className="mobile-contact-content-padding">

          {/* Head Office */}
          <div className="mobile-contact-card" style={{marginBottom: '20px'}}>
            <div className="mobile-contact-card-inner">
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                <i className="fas fa-building" style={{color: '#FFD700', fontSize: '20px'}}></i>
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', margin: '0'}}>
                  Head Office
                </h3>
              </div>
              <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                <i className="fas fa-map-marker-alt" style={{color: '#FFD700', marginTop: '2px'}}></i>
                <div>
                  <div style={{fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '4px'}}>
                    Location
                  </div>
                  <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5'}}>
                    2, Akin Osiyemi, Allen Avenue.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phone Numbers */}
          <div className="mobile-contact-card" style={{marginBottom: '20px'}}>
            <div className="mobile-contact-card-inner">
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                <i className="fas fa-phone" style={{color: '#FFD700', fontSize: '20px'}}></i>
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', margin: '0'}}>
                  Phone Numbers
                </h3>
              </div>

              {/* Calls Only */}
              <div style={{marginBottom: '16px'}}>
                <div style={{fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: '8px'}}>
                  CALLS ONLY
                </div>
                <button
                  onClick={() => handleCall('08021495027')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginBottom: '8px'
                  }}
                >
                  <span>08021495027</span>
                  <i className="fas fa-phone" style={{color: '#FFD700'}}></i>
                </button>
              </div>

              {/* WhatsApp Only */}
              <div>
                <div style={{fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: '8px'}}>
                  WHATSAPP ONLY
                </div>
                <button
                  onClick={() => handleWhatsApp('09040001503')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(29, 161, 242, 0.1)',
                    border: '1px solid rgba(29, 161, 242, 0.3)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <span>09040001503</span>
                  <i className="fab fa-whatsapp" style={{color: '#25D366'}}></i>
                </button>
              </div>
            </div>
          </div>

          {/* Community */}
          <div className="mobile-contact-card" style={{marginBottom: '20px'}}>
            <div className="mobile-contact-card-inner">
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                <i className="fas fa-users" style={{color: '#FFD700', fontSize: '20px'}}></i>
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', margin: '0'}}>
                  Join Our Live Community
                </h3>
              </div>
              <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '16px'}}>
                for Discounts
              </div>

              <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px'}}>
                {socialLinks.map((social) => (
                  <button
                    key={social.name}
                    onClick={() => handleOpenLink(social.url)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      minWidth: '100px',
                      justifyContent: 'center'
                    }}
                  >
                    <i className={social.icon} style={{color: social.color}}></i>
                    <span>{social.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className="mobile-contact-card">
            <div className="mobile-contact-card-inner">
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                <i className="fas fa-clock" style={{color: '#FFD700', fontSize: '20px'}}></i>
                <h3 style={{fontSize: '18px', fontWeight: '600', color: 'white', margin: '0'}}>
                  Working Hours
                </h3>
              </div>

              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <i className="fas fa-calendar-week" style={{color: '#FFD700'}}></i>
                <div>
                  <div style={{fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '4px'}}>
                    9am to 5pm
                  </div>
                  <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.7)'}}>
                    Mondays to Fridays Only
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default MobileContactPage