import { useEffect, useMemo, useState } from 'react'
import { useDescope, useSession } from '@descope/react-sdk'
import AdminHeader from './components/AdminHeader'
import AdminSidebar from './components/AdminSidebar'
import AdminFooter from './components/AdminFooter'
import DashboardPage from './pages/DashboardPage'
import UsersPage, { type AdminUser } from './pages/UsersPage'
import AccountsPage from './pages/AccountsPage'
import FundedAccountsPage from './pages/FundedAccountsPage'
import BreachesPage from './pages/BreachesPage'
import OrdersPage from './pages/OrdersPage'
import PayoutsPage from './pages/PayoutsPage'
import UserProfilePage from './pages/UserProfilePage'
import KycReviewPage from './pages/KycReviewPage'
import ReferralsPage from './pages/ReferralsPage'
import FinanceAnalysisPage from './pages/FinanceAnalysisPage'
import CouponsPage from './pages/CouponsPage'
import SupportTicketsPage from './pages/SupportTicketsPage'
import SettingsPage from './pages/SettingsPage'
import WorkBoardPage from './pages/WorkBoardPage'
import MT5Page from './pages/MT5Page'
import SendAnnouncementPage from './pages/SendAnnouncementPage'
import EmailLogsPage from './pages/EmailLogsPage'
import SalaryPage from './pages/SalaryPage'
import MigrationRequestsPage from './pages/MigrationRequestsPage'
import {
  adminLoginWithBackend,
  clearPersistedAdminUser,
  fetchAdminMe,
  getPersistedAdminUser,
  logoutAdmin,
  persistAdminUser,
  type AdminAuthMeResponse,
} from './lib/adminAuth'
import AdminAuthCard from './components/AdminAuthCard'
import './App.css'

type AdminPage = 'analysis' | 'users' | 'accounts' | 'fundedAccounts' | 'breaches' | 'orders' | 'payouts' | 'userProfile' | 'kycReview' | 'referrals' | 'financeAnalysis' | 'coupons' | 'supportTickets' | 'settings' | 'workBoard' | 'mt5' | 'sendAnnouncement' | 'migrationRequests' | 'emailLogs' | 'salary'

const DEFAULT_SESSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000

function getRefreshIntervalMs(): number {
  const configured = Number(import.meta.env.VITE_ADMIN_SESSION_REFRESH_INTERVAL_MS)
  if (!Number.isFinite(configured) || configured < 60_000) {
    return DEFAULT_SESSION_REFRESH_INTERVAL_MS
  }
  return configured
}

function readableAuthError(message: string): string {
  if (message.toLowerCase().includes('failed to fetch')) {
    return 'Could not reach authentication service. Please retry.'
  }
  if (message.includes('Admin access denied')) {
    return 'Your admin account is not allowlisted yet. Contact super admin.'
  }
  if (message.includes('MFA is required for admin access')) {
    return 'MFA required. Complete TOTP/recovery-code verification and try again.'
  }
  if (message.includes('Admin MFA enrollment required')) {
    return 'MFA setup required. Complete TOTP enrollment before admin access.'
  }
  if (message.includes('No Descope session token available')) {
    return 'Please complete the admin sign-in flow.'
  }
  return message
}

function isAdminAccessDeniedError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('admin access denied') ||
    lower.includes('insufficient admin role') ||
    lower.includes('admin account is not active')
  )
}

function App() {
  const descopeSdk = useDescope()
  // Keep session refreshed in background to reduce unexpected admin sign-outs during testing.
  useSession()
  const [activePage, setActivePage] = useState<AdminPage>('analysis')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [authUser, setAuthUser] = useState<AdminAuthMeResponse | null>(getPersistedAdminUser())
  const [authLoading, setAuthLoading] = useState(true)
  const [authSyncing, setAuthSyncing] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authRetryKey, setAuthRetryKey] = useState(0)
  const [authBlocked, setAuthBlocked] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    void descopeSdk.refresh().catch(() => {
      // best effort refresh on app load
    })
  }, [descopeSdk])

  useEffect(() => {
    if (!authUser) return

    const intervalId = window.setInterval(() => {
      void descopeSdk.refresh().catch(() => {
        // best effort background refresh
      })
    }, getRefreshIntervalMs())

    return () => {
      window.clearInterval(intervalId)
    }
  }, [authUser, descopeSdk])

  useEffect(() => {
    const verifyAdminSession = async () => {
      setAuthLoading(true)
      try {
        const user = await fetchAdminMe()
        persistAdminUser(user)
        setAuthUser(user)
        setAuthError('')
        setAuthBlocked(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        clearPersistedAdminUser()
        setAuthUser(null)
        setAuthBlocked(isAdminAccessDeniedError(message))
      } finally {
        setAuthLoading(false)
      }
    }

    verifyAdminSession()
  }, [])

  useEffect(() => {
    if (!authUser || authUser.role === 'super_admin' || !authUser.allowed_pages) return;

    const possiblePages = ['analysis', 'users', 'accounts', 'fundedAccounts', 'breaches', 'orders', 'payouts', 'kycReview', 'referrals', 'financeAnalysis', 'coupons', 'supportTickets', 'settings', 'workBoard', 'mt5', 'sendAnnouncement', 'migrationRequests', 'emailLogs', 'salary'];
    const firstAllowed = possiblePages.find(page => authUser.allowed_pages?.includes(page) ?? false);
    if (!firstAllowed) {
      setAuthError('No pages assigned to this admin account.');
      return;
    }

    if (activePage === 'userProfile') {
      return;
    }

    if (activePage !== firstAllowed && !authUser.allowed_pages.includes(activePage)) {
      setActivePage(firstAllowed as AdminPage);
    }
  }, [authUser, activePage]);

  const roleLabel = useMemo(() => {
    if (!authUser) return 'Admin'
    return authUser.role === 'super_admin' ? 'Super Admin' : 'Admin'
  }, [authUser])

  const handleDescopeSuccess = async (sessionJwt?: string) => {
    setAuthError('')
    setAuthSyncing(true)

    try {
      const user = await adminLoginWithBackend(sessionJwt)
      persistAdminUser(user)
      setAuthUser(user)
      setAuthBlocked(false)
    } catch (error) {
      clearPersistedAdminUser()
      setAuthUser(null)
      const message = error instanceof Error ? error.message : 'Admin authentication failed'
      setAuthBlocked(isAdminAccessDeniedError(message))
      setAuthError(readableAuthError(message))
    } finally {
      setAuthSyncing(false)
    }
  }

  const handleDescopeError = (message: string) => {
    setAuthError(readableAuthError(message))
  }

  const handleOpenUserProfile = (user: AdminUser) => {
    setSelectedUser(user)
    setActivePage('userProfile')
  }

  const handleBackToUsers = () => {
    setActivePage('users')
  }

  const handleResetLogin = () => {
    clearPersistedAdminUser()
    setAuthUser(null)
    setAuthError('')
    setAuthBlocked(false)
    setAuthRetryKey((prev) => prev + 1)
  }

  const handleRetryAuthWidget = () => {
    setAuthError('')
    setAuthRetryKey((prev) => prev + 1)
  }

  const handleAdminLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    try {
      await logoutAdmin()
    } catch {
      // best effort logout
    }

    try {
      await descopeSdk.logout()
    } catch {
      // best effort logout
    }

    clearPersistedAdminUser()
    setAuthUser(null)
    setAuthError('')
    setAuthBlocked(false)
    setSelectedUser(null)
    setActivePage('analysis')
    setAuthRetryKey((prev) => prev + 1)
    setIsLoggingOut(false)
  }

  if (authLoading) {
    return (
      <div className="admin-auth-page">
        <div className="admin-auth-card">
          <h1>Admin Portal</h1>
          <p>Checking your admin session...</p>
        </div>
      </div>
    )
  }

  if (!authUser) {
    if (authBlocked) {
      return (
        <div className="admin-auth-page">
          <div className="admin-auth-card">
            <h1>404</h1>
            <p>The page you requested could not be found.</p>
            <button className="admin-auth-reset-btn" onClick={handleResetLogin}>Return to Sign In</button>
          </div>
        </div>
      )
    }

    return (
      <div className="admin-auth-page">
        <div className="admin-auth-card">
          <img src="/white-logo.svg" alt="NairaTrader" className="admin-auth-logo" />
          <h1>Admin Sign In</h1>

          <AdminAuthCard
            key={authRetryKey}
            onSuccess={handleDescopeSuccess}
            onError={handleDescopeError}
          />

          {authSyncing && <p className="admin-auth-note">Finalizing admin access...</p>}
          {authError && <p className="admin-auth-error">{authError}</p>}

          {authError.toLowerCase().includes('could not reach authentication service') && (
            <button className="admin-auth-secondary-btn" onClick={handleRetryAuthWidget}>
              Retry Authentication
            </button>
          )}

          <button className="admin-auth-reset-btn" onClick={handleResetLogin}>Reset Login State</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard-page">
      <AdminHeader roleLabel={roleLabel} fullName={authUser.full_name || authUser.email} />

      <div className="admin-dashboard-body">
        <AdminSidebar
          activePage={activePage}
          onNavigate={setActivePage}
          onLogout={handleAdminLogout}
          isLoggingOut={isLoggingOut}
          allowedPages={authUser.allowed_pages ?? []}
          userRole={authUser.role}
        />

        <main className="admin-dashboard-content">
          {authError && (
            <div className="admin-no-access">
              <h2>Error</h2>
              <p>{authError}</p>
              <button onClick={handleAdminLogout}>Logout</button>
            </div>
          )}
          {!authError && activePage === 'analysis' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('analysis'))) && <DashboardPage onNavigate={setActivePage} />}
          {!authError && activePage === 'workBoard' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('workBoard'))) && <WorkBoardPage />}
          {!authError && activePage === 'users' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('users'))) && <UsersPage onOpenProfile={handleOpenUserProfile} />}
          {!authError && activePage === 'accounts' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('accounts'))) && <AccountsPage onOpenProfile={handleOpenUserProfile} />}
          {!authError && activePage === 'fundedAccounts' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('fundedAccounts'))) && <FundedAccountsPage onOpenProfile={handleOpenUserProfile} />}
          {!authError && activePage === 'breaches' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('breaches'))) && <BreachesPage onOpenProfile={handleOpenUserProfile} />}
          {!authError && activePage === 'mt5' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('mt5'))) && <MT5Page />}
          {!authError && activePage === 'orders' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('orders'))) && <OrdersPage onOpenProfile={handleOpenUserProfile} />}
          {!authError && activePage === 'payouts' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('payouts'))) && <PayoutsPage onOpenProfile={handleOpenUserProfile} />}
          {!authError && activePage === 'financeAnalysis' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('financeAnalysis'))) && <FinanceAnalysisPage />}
          {!authError && activePage === 'coupons' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('coupons'))) && <CouponsPage />}
          {!authError && activePage === 'sendAnnouncement' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('sendAnnouncement'))) && <SendAnnouncementPage />}
          {!authError && activePage === 'emailLogs' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('emailLogs'))) && <EmailLogsPage />}
          {!authError && activePage === 'salary' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('salary'))) && <SalaryPage />}
          {!authError && activePage === 'supportTickets' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('supportTickets'))) && <SupportTicketsPage onOpenProfile={handleOpenUserProfile} />}
          {!authError && activePage === 'settings' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('settings'))) && <SettingsPage />}
          {!authError && activePage === 'kycReview' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('kycReview'))) && <KycReviewPage onOpenProfile={handleOpenUserProfile} />}
          {!authError && activePage === 'referrals' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('referrals'))) && <ReferralsPage />}
          {!authError && activePage === 'migrationRequests' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('migrationRequests'))) && <MigrationRequestsPage />}
          {!authError && activePage === 'userProfile' && selectedUser && (
            <UserProfilePage user={selectedUser} onBack={handleBackToUsers} />
          )}
          {!authError && !['analysis', 'workBoard', 'users', 'accounts', 'fundedAccounts', 'breaches', 'mt5', 'orders', 'payouts', 'financeAnalysis', 'coupons', 'sendAnnouncement', 'supportTickets', 'settings', 'kycReview', 'referrals', 'migrationRequests', 'userProfile', 'emailLogs', 'salary'].includes(activePage) && (
            <div className="admin-no-access">
              <h2>Access Denied</h2>
              <p>You do not have permission to access this page. Please select an available page from the sidebar.</p>
            </div>
          )}
        </main>
      </div>

      <AdminFooter />
    </div>
  )
}

export default App