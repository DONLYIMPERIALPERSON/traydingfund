import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileHomeHeader.css'

const MobileHomeHeader: React.FC = () => {
  const navigate = useNavigate()

  const handleAddAccount = () => {
    navigate('/trading-accounts')
  }

  return (
    <div className="section">
      <div className="home-header-row">
        <div className="accounts-left">
          <span className="accounts-text">Accounts</span>
        </div>
        <div className="pulse-notification-group">
          <i className="fas fa-plus add-account-icon" onClick={handleAddAccount} style={{cursor: 'pointer'}}></i>
          <i className="far fa-bell notification-icon"></i>
        </div>
      </div>
    </div>
  )
}

export default MobileHomeHeader