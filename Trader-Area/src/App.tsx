import React, { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AffiliateRefRedirect from './components/AffiliateRefRedirect'
import { SidebarProvider } from './contexts/SidebarContext'
import HomePage from './pages/HomePage'
import AccountDetailsPage from './pages/AccountDetailsPage'
import SupportPage from './pages/SupportPage'
import MobileSupportPage from './pages/MobileSupportPage'
import TradingAccountsPage from './pages/TradingAccountsPage'
import MobileTradingAccountsPage from './pages/MobileTradingAccountsPage'
import StartChallengePage from './pages/StartChallengePage'
import MobileStartChallengePage from './pages/MobileStartChallengePage'
import PayoutPage from './pages/PayoutPage'
import MobileRewardPage from './pages/MobileRewardPage'
import AffiliatePage from './pages/AffiliatePage'
import MobileAffiliatePage from './pages/MobileAffiliatePage'
import ContactPage from './pages/ContactPage'
import MobileContactPage from './pages/MobileContactPage'
import ProfilePage from './pages/ProfilePage'
import MobileProfilePage from './pages/MobileProfilePage'
import SettingsPage from './pages/SettingsPage'
import MobileSettingsPage from './pages/MobileSettingsPage'
import CertificatePage from './pages/CertificatePage'
import MobileCertificatesPage from './pages/MobileCertificatesPage'
import KYCPage from './pages/KYCPage'
import MobileKYCPage from './pages/MobileKYCPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AccountOverviewPage from './pages/AccountOverviewPage'
import MobileMetricsPage from './pages/MobileMetricsPage'
import MobileStatsPage from './pages/MobileStatsPage'
import MobileLeaderboardPage from './pages/MobileLeaderboardPage'
import StatisticsPage from './pages/StatisticsPage'
import CredentialsPage from './pages/CredentialsPage'
import MobileCredentialsPage from './pages/MobileCredentialsPage'
import LoginPage from './pages/LoginPage'
import OrdersPage from './pages/OrdersPage'
import MobileOrdersPage from './pages/MobileOrdersPage'
import MobileHistoryPage from './pages/MobileHistoryPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import CalendarPage from './pages/CalendarPage'
import MobileCalendarPage from './pages/MobileCalendarPage'
import AccountRecoveryPage from './pages/AccountRecoveryPage'
import MobileOverviewPage from './pages/MobileOverviewPage'
import BreezyAnalyticsPage from './pages/BreezyAnalyticsPage'
import MobileBreezyAnalyticsPage from './pages/MobileBreezyAnalyticsPage'
import PWAPrompts from './components/PWAPrompts'
import AppLoadingScreen from './components/AppLoadingScreen'

const isAuthenticated = () => Boolean(localStorage.getItem('supabase_access_token'))
const isMobileViewport = () => window.matchMedia('(max-width: 768px)').matches

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}

const OverviewEntryRoute = () => (isMobileViewport() ? <MobileOverviewPage /> : <HomePage />)
const TradingAccountsEntryRoute = () => (isMobileViewport() ? <MobileTradingAccountsPage /> : <TradingAccountsPage />)
const CredentialsEntryRoute = () => (isMobileViewport() ? <MobileCredentialsPage /> : <CredentialsPage />)
const MetricsEntryRoute = () => (isMobileViewport() ? <MobileMetricsPage /> : <AccountOverviewPage />)
const StatisticsEntryRoute = () => (isMobileViewport() ? <MobileStatsPage /> : <StatisticsPage />)
const BreezyAnalyticsEntryRoute = () => (isMobileViewport() ? <MobileBreezyAnalyticsPage /> : <BreezyAnalyticsPage />)
const CalendarEntryRoute = () => (isMobileViewport() ? <MobileCalendarPage /> : <CalendarPage />)
const StartChallengeEntryRoute = () => (isMobileViewport() ? <MobileStartChallengePage /> : <StartChallengePage />)
const OrdersEntryRoute = () => (isMobileViewport() ? <MobileOrdersPage /> : <OrdersPage />)
const CertificatesEntryRoute = () => (isMobileViewport() ? <MobileCertificatesPage /> : <CertificatePage />)
const SettingsEntryRoute = () => (isMobileViewport() ? <MobileSettingsPage /> : <SettingsPage />)
const KYCEntryRoute = () => (isMobileViewport() ? <MobileKYCPage /> : <KYCPage />)
const SupportEntryRoute = () => (isMobileViewport() ? <MobileSupportPage /> : <SupportPage />)
const ContactEntryRoute = () => (isMobileViewport() ? <MobileContactPage /> : <ContactPage />)
const ProfileEntryRoute = () => (isMobileViewport() ? <MobileProfilePage /> : <ProfilePage />)
const AffiliateEntryRoute = () => (isMobileViewport() ? <MobileAffiliatePage /> : <AffiliatePage />)
const RewardEntryRoute = () => (isMobileViewport() ? <MobileRewardPage /> : <PayoutPage />)

function App() {
  const [showLoadingScreen, setShowLoadingScreen] = useState(true)

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowLoadingScreen(false), 900)
    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <SidebarProvider>
      <BrowserRouter>
        <AppLoadingScreen visible={showLoadingScreen} />
        <PWAPrompts />
        <Routes>
          <Route path="/ref/:affiliateId" element={<AffiliateRefRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <OverviewEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account-details"
            element={
              <ProtectedRoute>
                <AccountDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <SupportEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support/chat/:chatId"
            element={
              <ProtectedRoute>
                <SupportEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trading-accounts"
            element={
              <ProtectedRoute>
                <TradingAccountsEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/start-challenge"
            element={
              <ProtectedRoute>
                <StartChallengeEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile-start-challenge"
            element={
              <ProtectedRoute>
                <MobileStartChallengePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payout"
            element={
              <ProtectedRoute>
                <RewardEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile-history"
            element={
              <ProtectedRoute>
                <MobileHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/affiliate"
            element={
              <ProtectedRoute>
                <AffiliateEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <ContactEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/edit-name"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/payout-details"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <CertificatesEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kyc"
            element={
              <ProtectedRoute>
                <KYCEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account-overview"
            element={
              <ProtectedRoute>
                <MetricsEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile-leaderboard"
            element={
              <ProtectedRoute>
                <MobileLeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics"
            element={
              <ProtectedRoute>
                <StatisticsEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/breezy-analytics"
            element={
              <ProtectedRoute>
                <BreezyAnalyticsEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credentials"
            element={
              <ProtectedRoute>
                <CredentialsEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarEntryRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile-calendar"
            element={
              <ProtectedRoute>
                <MobileCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile-overview"
            element={
              <ProtectedRoute>
                <MobileOverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account-recovery"
            element={
              <ProtectedRoute>
                <AccountRecoveryPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </SidebarProvider>
  )
}

export default App
