import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileDashboardHeader.css'

interface HeaderProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
}

const MobileDashboardHeader: React.FC<HeaderProps> = ({ activeTab = 'Overview', onTabChange }) => {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="mobile-dashboard-header">
      <div className="mobile-dashboard-header-row">
        <div className="mobile-dashboard-header-left">
          <div className="mobile-dashboard-back-button" onClick={handleBack} style={{cursor: 'pointer'}}>
            <i className="fas fa-chevron-left"></i>
          </div>
        </div>
        <div className="mobile-dashboard-header-right">
          <div className="mobile-dashboard-support-icon" onClick={() => navigate('/support')} style={{cursor: 'pointer'}}>
            <i className="fas fa-message"></i>
            <span>Support</span>
          </div>
          <div className="mobile-dashboard-key-icon" onClick={() => onTabChange?.('Account')} style={{cursor: 'pointer'}}>
            <i className="fas fa-key"></i>
            <span>Key</span>
          </div>
        </div>
      </div>

      <div className="mobile-dashboard-tabs-container">
        <div className={`mobile-dashboard-tab ${activeTab === 'Overview' ? 'active' : ''}`} onClick={() => onTabChange?.('Overview')} style={{cursor: 'pointer'}}>Overview</div>
        <div className={`mobile-dashboard-tab ${activeTab === 'Statistics' ? 'active' : ''}`} onClick={() => onTabChange?.('Statistics')} style={{cursor: 'pointer'}}>Statistics</div>
        <div className={`mobile-dashboard-tab ${activeTab === 'Account' ? 'active' : ''}`} onClick={() => onTabChange?.('Account')} style={{cursor: 'pointer'}}>Account</div>
      </div>
    </div>
  )
}

export default MobileDashboardHeader