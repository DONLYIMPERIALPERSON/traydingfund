import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SidebarProvider } from './contexts/SidebarContext'
import HomePage from './pages/HomePage'
import AccountDetailsPage from './pages/AccountDetailsPage'
import SupportPage from './pages/SupportPage'
import TradingAccountsPage from './pages/TradingAccountsPage'
import StartChallengePage from './pages/StartChallengePage'
import PayoutPage from './pages/PayoutPage'
import AffiliatePage from './pages/AffiliatePage'
import ContactPage from './pages/ContactPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import CertificatePage from './pages/CertificatePage'
import KYCPage from './pages/KYCPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AccountOverviewPage from './pages/AccountOverviewPage'
import StatisticsPage from './pages/StatisticsPage'
import CredentialsPage from './pages/CredentialsPage'
import LoginPage from './pages/LoginPage'
function App() {
  return (
    <SidebarProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />
          <Route path="/account-details" element={<AccountDetailsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/support/chat/:chatId" element={<SupportPage />} />
          <Route path="/trading-accounts" element={<TradingAccountsPage />} />
          <Route path="/start-challenge" element={<StartChallengePage />} />
          <Route path="/payout" element={<PayoutPage />} />
          <Route path="/affiliate" element={<AffiliatePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit-name" element={<ProfilePage />} />
          <Route path="/profile/payout-details" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/certificates" element={<CertificatePage />} />
          <Route path="/kyc" element={<KYCPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/account-overview" element={<AccountOverviewPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/credentials" element={<CredentialsPage />} />
        </Routes>
      </BrowserRouter>
    </SidebarProvider>
  )
}

export default App
