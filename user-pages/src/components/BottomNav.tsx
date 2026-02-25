import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/BottomNav.css'

const BottomNav: React.FC = () => {
  const navigate = useNavigate()

  return (
    <>
      <div className="bottom-nav">
        <div className="nav-item active" onClick={() => navigate('/')}>
          <i className="fas fa-chart-line"></i>
          <span>Accounts</span>
        </div>
        <div className="nav-item" onClick={() => navigate('/payout')}>
          <i className="fas fa-credit-card"></i>
          <span>Payouts</span>
        </div>
        <div className="nav-item" onClick={() => navigate('/affiliate')}>
          <i className="fas fa-users"></i>
          <span>Affiliate</span>
        </div>
        <label htmlFor="menu-modal-toggle" className="nav-item">
          <i className="fas fa-bars"></i>
          <span>Menu</span>
        </label>
      </div>

      <input type="checkbox" id="menu-modal-toggle" />
      <div className="menu-modal">
        <div className="menu-modal-content">
          <div className="menu-modal-header">
            <h3><i className="fas fa-compass"></i> Menu</h3>
            <label htmlFor="menu-modal-toggle" className="close-modal">
              <i className="fas fa-xmark"></i> Close
            </label>
          </div>
          <div className="menu-grid">
            <div className="menu-item" onClick={() => navigate('/')}>
              <div className="menu-icon"><i className="fas fa-chart-pie"></i></div>
              <span>Dashboard</span>
            </div>
            <div className="menu-item" onClick={() => navigate('/trading-accounts')}>
              <div className="menu-icon"><i className="fas fa-cart-plus"></i></div>
              <span>Buy Account</span>
            </div>
            <div className="menu-item" onClick={() => navigate('/affiliate')}>
              <div className="menu-icon"><i className="fas fa-users"></i></div>
              <span>Affiliate</span>
            </div>
            <div className="menu-item" onClick={() => navigate('/support')}>
              <div className="menu-icon"><i className="fas fa-headset"></i></div>
              <span>Support</span>
            </div>
            <div className="menu-item" onClick={() => navigate('/promotions')}>
              <div className="menu-icon"><i className="fas fa-gift"></i></div>
              <span>Promotions</span>
            </div>
            <div className="menu-item" onClick={() => navigate('/competition')}>
              <div className="menu-icon"><i className="fas fa-trophy"></i></div>
              <span>Competition</span>
            </div>
            <div className="menu-item" onClick={() => navigate('/contact')}>
              <div className="menu-icon"><i className="fas fa-envelope"></i></div>
              <span>Contact</span>
            </div>
            <div className="menu-item" onClick={() => navigate('/profile')}>
              <div className="menu-icon"><i className="fas fa-user"></i></div>
              <span>Profile</span>
            </div>
            <div className="menu-item" onClick={() => navigate('/settings')}>
              <div className="menu-icon"><i className="fas fa-gear"></i></div>
              <span>Settings</span>
            </div>
            <div className="menu-item" onClick={() => navigate('/certificates')}>
              <div className="menu-icon"><i className="fas fa-certificate"></i></div>
              <span>Certificate</span>
            </div>
            <div className="menu-item" onClick={() => navigate('/kyc')}>
              <div className="menu-icon"><i className="fas fa-id-card"></i></div>
              <span>KYC</span>
            </div>
            <div className="menu-item" onClick={() => window.open('https://nairatrader.com', '_blank')}>
              <div className="menu-icon"><i className="fas fa-home"></i></div>
              <span>Home</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default BottomNav