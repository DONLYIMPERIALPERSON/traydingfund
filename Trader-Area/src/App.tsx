import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SidebarProvider } from './contexts/SidebarContext'
import HomeDesktop from './pages/HomeDesktop'
import DesktopAccountDetailsPage from './pages/DesktopAccountDetailsPage'
import DesktopSupportPage from './pages/DesktopSupportPage'
import DesktopTradingAccountsPage from './pages/DesktopTradingAccountsPage'
import DesktopPayoutPage from './pages/DesktopPayoutPage'
import DesktopAffiliatePage from './pages/DesktopAffiliatePage'
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
function App() {
  return (
    <SidebarProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeDesktop />} />
          <Route path="/login" element={<DesktopLoginPage />} />
          <Route path="/register" element={<DesktopLoginPage />} />
          <Route path="/account-details" element={<DesktopAccountDetailsPage />} />
          <Route path="/support" element={<DesktopSupportPage />} />
          <Route path="/support/chat/:chatId" element={<DesktopSupportPage />} />
          <Route path="/trading-accounts" element={<DesktopTradingAccountsPage />} />
          <Route path="/start-challenge" element={<DesktopStartChallengePage />} />
          <Route path="/payout" element={<DesktopPayoutPage />} />
          <Route path="/affiliate" element={<DesktopAffiliatePage />} />
          <Route path="/contact" element={<DesktopContactPage />} />
          <Route path="/profile" element={<DesktopProfilePage />} />
          <Route path="/profile/edit-name" element={<DesktopProfilePage />} />
          <Route path="/profile/payout-details" element={<DesktopProfilePage />} />
          <Route path="/settings" element={<DesktopSettingsPage />} />
          <Route path="/certificates" element={<DesktopCertificatePage />} />
          <Route path="/kyc" element={<DesktopKYCPage />} />
          <Route path="/leaderboard" element={<DesktopLeaderboardPage />} />
          <Route path="/account-overview" element={<DesktopAccountOverviewPage />} />
          <Route path="/statistics" element={<DesktopStatisticsPage />} />
          <Route path="/credentials" element={<DesktopCredentialsPage />} />
        </Routes>
      </BrowserRouter>
    </SidebarProvider>
  )
}

export default App
