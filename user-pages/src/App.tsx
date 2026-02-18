import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomeMobile from './pages/HomeMobile'
import HomeDesktop from './pages/HomeDesktop'
import MobileAccountDetailsPage from './pages/MobileAccountDetailsPage'
import MobileSupportPage from './pages/MobileSupportPage'
import MobilePreviousChatsPage from './pages/MobilePreviousChatsPage'
import MobileTradingAccountsPage from './pages/MobileTradingAccountsPage'
import MobileStartChallengePage from './pages/MobileStartChallengePage'
import MobilePayoutPage from './pages/MobilePayoutPage'
import MobileAffiliatePage from './pages/MobileAffiliatePage'
import MobilePromotionsPage from './pages/MobilePromotionsPage'
import MobileCompetitionPage from './pages/MobileCompetitionPage'
import MobileContactPage from './pages/MobileContactPage'
import MobileProfilePage from './pages/MobileProfilePage'
import MobileEditNamePage from './pages/MobileEditNamePage'
import MobilePayoutDetailsPage from './pages/MobilePayoutDetailsPage'
import MobileSettingsPage from './pages/MobileSettingsPage'
import MobileCertificatePage from './pages/MobileCertificatePage'
import MobileKYCPage from './pages/MobileKYCPage'
import MobileLeaderboardPage from './pages/MobileLeaderboardPage'
import DesktopAccountDetailsPage from './pages/DesktopAccountDetailsPage'
import DesktopSupportPage from './pages/DesktopSupportPage'
import DesktopTradingAccountsPage from './pages/DesktopTradingAccountsPage'
import DesktopPayoutPage from './pages/DesktopPayoutPage'
import DesktopAffiliatePage from './pages/DesktopAffiliatePage'
import DesktopPromotionsPage from './pages/DesktopPromotionsPage'
import DesktopCompetitionPage from './pages/DesktopCompetitionPage'
import DesktopContactPage from './pages/DesktopContactPage'
import DesktopProfilePage from './pages/DesktopProfilePage'
import DesktopSettingsPage from './pages/DesktopSettingsPage'
import DesktopCertificatePage from './pages/DesktopCertificatePage'
import DesktopKYCPage from './pages/DesktopKYCPage'
import DesktopLeaderboardPage from './pages/DesktopLeaderboardPage'
import DesktopAccountOverviewPage from './pages/DesktopAccountOverviewPage'
import DesktopStatisticsPage from './pages/DesktopStatisticsPage'
import DesktopCredentialsPage from './pages/DesktopCredentialsPage'
import DesktopStartChallengePage from './pages/DesktopStartChallengePage'
import DesktopLoginPage from './pages/DesktopLoginPage'
import DesktopRegisterPage from './pages/DesktopRegisterPage'
import MobileLoginPage from './pages/MobileLoginPage'
import MobileRegisterPage from './pages/MobileRegisterPage'

function App() {
  const isMobile = window.innerWidth < 768
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isMobile ? <HomeMobile /> : <HomeDesktop />} />
        <Route path="/login" element={isMobile ? <MobileLoginPage /> : <DesktopLoginPage />} />
        <Route path="/register" element={isMobile ? <MobileRegisterPage /> : <DesktopRegisterPage />} />
        <Route path="/account-details" element={isMobile ? <MobileAccountDetailsPage /> : <DesktopAccountDetailsPage />} />
        <Route path="/support" element={isMobile ? <MobileSupportPage /> : <DesktopSupportPage />} />
        <Route path="/previous-chats" element={<MobilePreviousChatsPage />} />
        <Route path="/trading-accounts" element={isMobile ? <MobileTradingAccountsPage /> : <DesktopTradingAccountsPage />} />
        <Route path="/start-challenge" element={isMobile ? <MobileStartChallengePage /> : <DesktopStartChallengePage />} />
        <Route path="/payout" element={isMobile ? <MobilePayoutPage /> : <DesktopPayoutPage />} />
        <Route path="/affiliate" element={isMobile ? <MobileAffiliatePage /> : <DesktopAffiliatePage />} />
        <Route path="/promotions" element={isMobile ? <MobilePromotionsPage /> : <DesktopPromotionsPage />} />
        <Route path="/competition" element={isMobile ? <MobileCompetitionPage /> : <DesktopCompetitionPage />} />
        <Route path="/contact" element={isMobile ? <MobileContactPage /> : <DesktopContactPage />} />
        <Route path="/profile" element={isMobile ? <MobileProfilePage /> : <DesktopProfilePage />} />
        <Route path="/profile/edit-name" element={<MobileEditNamePage />} />
        <Route path="/profile/payout-details" element={<MobilePayoutDetailsPage />} />
        <Route path="/settings" element={isMobile ? <MobileSettingsPage /> : <DesktopSettingsPage />} />
        <Route path="/certificates" element={isMobile ? <MobileCertificatePage /> : <DesktopCertificatePage />} />
        <Route path="/kyc" element={isMobile ? <MobileKYCPage /> : <DesktopKYCPage />} />
        <Route path="/leaderboard" element={isMobile ? <MobileLeaderboardPage /> : <DesktopLeaderboardPage />} />
        <Route path="/account-overview" element={<DesktopAccountOverviewPage />} />
        <Route path="/statistics" element={<DesktopStatisticsPage />} />
        <Route path="/credentials" element={<DesktopCredentialsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
