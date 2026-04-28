import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileContactPage.css'

const socialLinks = [
  { name: 'Discord', color: '#5865F2', url: 'https://discord.gg/93trVSkjcf' },
  { name: 'X', color: '#ffffff', url: 'https://x.com/machefunded?s=21' },
  { name: 'Instagram', color: '#E1306C', url: 'https://www.instagram.com/mache.funded?igsh=NDZsbXhzM3c4d2hu&utm_source=qr' },
]

const MobileContactPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="mobile-contact-page">
      <div className="mobile-contact-shell">
        <header className="mobile-contact-header">
          <button type="button" className="mobile-contact-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-contact-header__text">
            <h1>Contact</h1>
            <p>Reach our team through direct channels and community spaces.</p>
          </div>
          <button type="button" className="mobile-contact-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        <section className="mobile-contact-card">
          <div className="mobile-contact-card__header">
            <i className="fas fa-message" />
            <h2>WhatsApp</h2>
          </div>
          <p>Chat with our support team on WhatsApp.</p>
          <a href="https://wa.me/447888378812" target="_blank" rel="noreferrer" className="mobile-contact-link">
            <span>+44 7888 378 812</span>
            <i className="fab fa-whatsapp" />
          </a>
        </section>

        <section className="mobile-contact-card">
          <div className="mobile-contact-card__header">
            <i className="fas fa-envelope" />
            <h2>Email</h2>
          </div>
          <p>Send us an email and we’ll respond quickly.</p>
          <a href="mailto:help@machefunded.com" className="mobile-contact-link">
            <span>help@machefunded.com</span>
            <i className="fas fa-envelope" />
          </a>
        </section>

        <section className="mobile-contact-card">
          <div className="mobile-contact-card__header">
            <i className="fas fa-users" />
            <h2>Join our live community</h2>
          </div>
          <div className="mobile-contact-social-grid">
            {socialLinks.map((social) => (
              <a key={social.name} href={social.url} target="_blank" rel="noreferrer" className="mobile-contact-social-link">
                <span className="mobile-contact-social-link__dot" style={{ backgroundColor: social.color }} />
                <span>{social.name}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default MobileContactPage