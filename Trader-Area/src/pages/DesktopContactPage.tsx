import React from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopContactPage.css'

const socialLinks = [
  { name: 'Discord', color: '#5865F2', url: 'https://discord.gg/HR6QW83W6' },
  { name: 'X', color: '#ffffff', url: 'https://x.com/machefunded?s=21' },
  { name: 'Instagram', color: '#E1306C', url: 'https://www.instagram.com/machefunded?igsh=Y2g0d3BrbnFkbmNl&utm_source=qr' },
]

const DesktopContactPage: React.FC = () => {
  return (
    <div className="contact-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="contact-content-wrapper">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="back-button"
        >
          <i className="fas fa-arrow-left"></i>
          Back to Accounts Overview
        </button>

        <div className="contact-header">
          <p className="contact-kicker">Contact</p>
          <h1>Get in touch with MacheFunded</h1>
          <p className="contact-subtitle">
            Reach our team through phone, WhatsApp, or our social communities. We’re available to support you at every stage.
          </p>
        </div>

        <div className="contact-grid">
          <div className="contact-card">
            <div className="card-header">
              <i className="fas fa-message"></i>
              <h3>WhatsApp</h3>
            </div>
            <p className="card-description">Chat with our support team on WhatsApp.</p>
            <a
              href="https://wa.me/447888378812"
              target="_blank"
              rel="noreferrer"
              className="contact-link"
            >
              <span>+44 7888 378 812</span>
              <i className="fab fa-whatsapp"></i>
            </a>
          </div>

          <div className="contact-card">
            <div className="card-header">
              <i className="fas fa-envelope"></i>
              <h3>Email</h3>
            </div>
            <p className="card-description">Send us an email and we’ll respond quickly.</p>
            <a
              href="mailto:help@machefunded.com"
              className="contact-link"
            >
              <span>help@machefunded.com</span>
              <i className="fas fa-envelope"></i>
            </a>
          </div>

          <div className="contact-card contact-card-wide">
            <div className="card-header">
              <i className="fas fa-users"></i>
              <h3>Join our live community</h3>
            </div>
            <div className="social-grid">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  className="social-link"
                >
                  {social.name}
                </a>
              ))}
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
