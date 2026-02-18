import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileSupportHeader.css'

const MobileSupportHeader: React.FC = () => {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const handleBack = () => {
    navigate(-1) // Go back to previous page
  }

  const toggleMenu = () => {
    setShowMenu(!showMenu)
  }

  const handleViewPrevious = () => {
    navigate('/previous-chats')
  }

  return (
    <div className="mobile-support-header">
      <div className="mobile-support-header-row">
        <div className="mobile-support-header-left">
          <div className="mobile-support-back-button" onClick={handleBack} style={{cursor: 'pointer'}}>
            <i className="fas fa-chevron-left"></i>
          </div>
        </div>
        <div className="mobile-support-header-center">
          <span className="mobile-support-header-title">Support</span>
        </div>
        <div className="mobile-support-header-right">
          <div className="mobile-support-menu-wrap">
            <i className="fas fa-ellipsis-v mobile-support-menu-trigger" onClick={toggleMenu}></i>
            {showMenu && (
              <div className="mobile-support-menu-dropdown">
                <div className="mobile-support-menu-item">End Chat</div>
                <div className="mobile-support-menu-item" onClick={handleViewPrevious}>View Previous Chat</div>
                <div className="mobile-support-menu-item">Start New Chat</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileSupportHeader