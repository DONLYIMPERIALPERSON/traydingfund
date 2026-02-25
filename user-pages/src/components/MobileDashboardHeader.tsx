import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileDashboardHeader.css'

interface HeaderProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
  onRefresh?: () => void
  refreshing?: boolean
  refreshCooldown?: number
  lastUpdated?: string | null
}

const MobileDashboardHeader: React.FC<HeaderProps> = ({
  activeTab = 'Overview',
  onTabChange,
  onRefresh,
  refreshing = false,
  refreshCooldown = 0,
  lastUpdated
}) => {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate('/')
  }

  const formatLastUpdated = (lastFeedAt: string | null): string => {
    if (!lastFeedAt) return 'Not updated yet'

    const now = new Date()
    const feedTime = new Date(lastFeedAt)
    const diffMs = now.getTime() - feedTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const formatCooldownTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`
    }
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      if (minutes === 0 && remainingSeconds === 0) {
        return `${hours}h`
      } else if (remainingSeconds === 0) {
        return `${hours}h ${minutes}m`
      } else {
        return `${hours}h ${minutes}m ${remainingSeconds}s`
      }
    } else {
      if (remainingSeconds === 0) {
        return `${minutes}m`
      }
      return `${minutes}m ${remainingSeconds}s`
    }
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
          {onRefresh && (
            <div
              className={`mobile-dashboard-refresh-icon ${refreshing ? 'refreshing' : ''} ${refreshCooldown > 0 ? 'cooldown' : ''}`}
              onClick={refreshCooldown > 0 || refreshing ? undefined : onRefresh}
              style={{
                cursor: refreshCooldown > 0 || refreshing ? 'not-allowed' : 'pointer',
                opacity: refreshCooldown > 0 || refreshing ? 0.6 : 1
              }}
            >
              <i className={`fas ${refreshing ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
              <span>
                {refreshing ? 'Updating...' : refreshCooldown > 0 ? formatCooldownTime(refreshCooldown) : 'Update'}
              </span>
            </div>
          )}
          <div className="mobile-dashboard-support-icon" onClick={() => navigate('/support')} style={{cursor: 'pointer'}}>
            <i className="fas fa-message"></i>
            <span>Support</span>
          </div>
        </div>
      </div>

      {lastUpdated !== undefined && (
        <div className="mobile-dashboard-last-updated">
          <i className="fas fa-clock"></i>
          Last updated: {formatLastUpdated(lastUpdated)}
        </div>
      )}

      <div className="mobile-dashboard-tabs-container">
        <div className={`mobile-dashboard-tab ${activeTab === 'Overview' ? 'active' : ''}`} onClick={() => onTabChange?.('Overview')} style={{cursor: 'pointer'}}>Overview</div>
        <div className={`mobile-dashboard-tab ${activeTab === 'Account' ? 'active' : ''}`} onClick={() => onTabChange?.('Account')} style={{cursor: 'pointer'}}>Account</div>
      </div>
    </div>
  )
}

export default MobileDashboardHeader