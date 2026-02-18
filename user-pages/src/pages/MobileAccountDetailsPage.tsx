import React, { useState } from 'react'
import MobileDashboardHeader from '../components/MobileDashboardHeader'
import MobileDashboardBalanceOverview from '../components/MobileDashboardBalanceOverview'
import MobileAnalysis from '../components/MobileAnalysis'
import MobileTradingObjective from '../components/MobileTradingObjective'
import MobileStatsPerformance from '../components/MobileStatsPerformance'
import MobileDailySummary from '../components/MobileDailySummary'
import MobileCredentials from '../components/MobileCredentials'
import '../styles/MobileAccountDetailsPage.css'

const MobileAccountDetailsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview')

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <>
            <div className="mobile-account-details-card">
              <MobileDashboardBalanceOverview />
            </div>
            <div className="mobile-account-details-card mobile-account-details-card-spaced">
              <MobileAnalysis />
            </div>
            <div className="mobile-account-details-card mobile-account-details-card-spaced">
              <MobileTradingObjective />
            </div>
          </>
        )
      case 'Statistics':
        return (
          <>
            <div className="mobile-account-details-card">
              <MobileStatsPerformance />
            </div>
            <div className="mobile-account-details-card mobile-account-details-card-spaced">
              <MobileDailySummary />
            </div>
          </>
        )
      case 'Account':
        return (
          <>
            <div className="mobile-account-details-card">
              <MobileCredentials />
            </div>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="mobile-account-details-page">
      <div className="mobile-account-details-fixed-header">
        <div className="mobile-account-details-header-shell">
          <MobileDashboardHeader activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      <div className="mobile-account-details-content">
        {renderContent()}
      </div>
    </div>
  )
}

export default MobileAccountDetailsPage