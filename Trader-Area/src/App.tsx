import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
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
import OrdersPage from './pages/OrdersPage'

const isAuthenticated = () => Boolean(localStorage.getItem('supabase_access_token'))

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}
function App() {
  return (
    <SidebarProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
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
                <SupportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support/chat/:chatId"
            element={
              <ProtectedRoute>
                <SupportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trading-accounts"
            element={
              <ProtectedRoute>
                <TradingAccountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/start-challenge"
            element={
              <ProtectedRoute>
                <StartChallengePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payout"
            element={
              <ProtectedRoute>
                <PayoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/affiliate"
            element={
              <ProtectedRoute>
                <AffiliatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <ContactPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
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
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <CertificatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kyc"
            element={
              <ProtectedRoute>
                <KYCPage />
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
                <AccountOverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics"
            element={
              <ProtectedRoute>
                <StatisticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/credentials"
            element={
              <ProtectedRoute>
                <CredentialsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </SidebarProvider>
  )
}

export default App
