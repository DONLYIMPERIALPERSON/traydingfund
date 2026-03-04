import React, { useEffect, useState } from 'react'
import { getSessionToken, useDescope, useSession } from '@descope/react-sdk'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SidebarProvider } from './contexts/SidebarContext'
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
import { getPersistedAuthUser } from './lib/auth'

function RequireUserAuth({ children }: { children: React.ReactElement }) {
  const descopeSdk = useDescope()
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSessionToken, setHasSessionToken] = useState(Boolean(getSessionToken()))
  const hasPersistedUser = Boolean(getPersistedAuthUser())

  useEffect(() => {
    let mounted = true

    const ensureSession = async () => {
      if (!hasPersistedUser) {
        if (mounted) {
          setHasSessionToken(false)
          setCheckingSession(false)
        }
        return
      }

      if (getSessionToken()) {
        if (mounted) {
          setHasSessionToken(true)
          setCheckingSession(false)
        }
        return
      }

      try {
        await descopeSdk.refresh()
      } catch {
        // best effort refresh
      }

      if (mounted) {
        setHasSessionToken(Boolean(getSessionToken()))
        setCheckingSession(false)
      }
    }

    void ensureSession()
    return () => {
      mounted = false
    }
  }, [descopeSdk, hasPersistedUser])

  if (checkingSession && hasPersistedUser) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Restoring session...</div>
  }

  if (!hasSessionToken || !hasPersistedUser) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  const descopeSdk = useDescope()
  useSession()

  const storeReferralCode = (code: string) => {
    if (!code) return
    try {
      const payload = { code, timestamp: Date.now() }
      localStorage.setItem('nairatrader_referral_code', JSON.stringify(payload))
    } catch {
      // ignore storage errors
    }
  }

  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/ref/')) {
      const code = path.split('/ref/')[1]?.split('/')[0]?.trim()
      const backendUrl = import.meta.env.VITE_BACKEND_URL
      if (!code) {
        window.location.replace('/login')
        return
      }
      if (!backendUrl) {
        window.location.replace('/login')
        return
      }

      storeReferralCode(code)

      fetch(`${backendUrl}/affiliate/click?affiliate_code=${encodeURIComponent(code)}`, { method: 'POST' })
        .catch(() => {
          // ignore tracking errors
        })
        .finally(() => {
          window.location.replace('/login')
        })
      return
    }

    const hasPersistedUser = Boolean(getPersistedAuthUser())
    if (!hasPersistedUser) return

    void descopeSdk.refresh().catch(() => {
      // best effort on app load
    })

    const intervalId = window.setInterval(() => {
      void descopeSdk.refresh().catch(() => {
        // best effort background refresh
      })
    }, 5 * 60 * 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [descopeSdk])

  const isMobile = window.innerWidth < 768
  return (
    <SidebarProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RequireUserAuth>{isMobile ? <HomeMobile /> : <HomeDesktop />}</RequireUserAuth>} />
          <Route path="/login" element={<DesktopLoginPage />} />
          <Route path="/register" element={<DesktopLoginPage />} />
          <Route path="/account-details" element={<RequireUserAuth>{isMobile ? <MobileAccountDetailsPage /> : <DesktopAccountDetailsPage />}</RequireUserAuth>} />
          <Route path="/support" element={<RequireUserAuth>{isMobile ? <MobilePreviousChatsPage /> : <DesktopSupportPage />}</RequireUserAuth>} />
          <Route path="/support/chat/:chatId" element={<RequireUserAuth><MobileSupportPage /></RequireUserAuth>} />
          <Route path="/trading-accounts" element={<RequireUserAuth>{isMobile ? <MobileTradingAccountsPage /> : <DesktopTradingAccountsPage />}</RequireUserAuth>} />
          <Route path="/start-challenge" element={<RequireUserAuth>{isMobile ? <MobileStartChallengePage /> : <DesktopStartChallengePage />}</RequireUserAuth>} />
          <Route path="/payout" element={<RequireUserAuth>{isMobile ? <MobilePayoutPage /> : <DesktopPayoutPage />}</RequireUserAuth>} />
          <Route path="/affiliate" element={<RequireUserAuth>{isMobile ? <MobileAffiliatePage /> : <DesktopAffiliatePage />}</RequireUserAuth>} />
          <Route path="/promotions" element={<RequireUserAuth>{isMobile ? <MobilePromotionsPage /> : <DesktopPromotionsPage />}</RequireUserAuth>} />
          <Route path="/competition" element={<RequireUserAuth>{isMobile ? <MobileCompetitionPage /> : <DesktopCompetitionPage />}</RequireUserAuth>} />
          <Route path="/contact" element={<RequireUserAuth>{isMobile ? <MobileContactPage /> : <DesktopContactPage />}</RequireUserAuth>} />
          <Route path="/profile" element={<RequireUserAuth>{isMobile ? <MobileProfilePage /> : <DesktopProfilePage />}</RequireUserAuth>} />
          <Route path="/profile/edit-name" element={<RequireUserAuth><MobileEditNamePage /></RequireUserAuth>} />
          <Route path="/profile/payout-details" element={<RequireUserAuth><MobilePayoutDetailsPage /></RequireUserAuth>} />
          <Route path="/settings" element={<RequireUserAuth>{isMobile ? <MobileSettingsPage /> : <DesktopSettingsPage />}</RequireUserAuth>} />
          <Route path="/certificates" element={<RequireUserAuth>{isMobile ? <MobileCertificatePage /> : <DesktopCertificatePage />}</RequireUserAuth>} />
          <Route path="/kyc" element={<RequireUserAuth>{isMobile ? <MobileKYCPage /> : <DesktopKYCPage />}</RequireUserAuth>} />
          <Route path="/leaderboard" element={<RequireUserAuth>{isMobile ? <MobileLeaderboardPage /> : <DesktopLeaderboardPage />}</RequireUserAuth>} />
          <Route path="/account-overview" element={<RequireUserAuth><DesktopAccountOverviewPage /></RequireUserAuth>} />
          <Route path="/statistics" element={<RequireUserAuth><DesktopStatisticsPage /></RequireUserAuth>} />
          <Route path="/credentials" element={<RequireUserAuth><DesktopCredentialsPage /></RequireUserAuth>} />
        </Routes>
      </BrowserRouter>
    </SidebarProvider>
  )
}

export default App
