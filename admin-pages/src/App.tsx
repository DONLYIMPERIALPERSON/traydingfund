import { useEffect, useMemo, useState } from 'react'
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
import TradingRulesPage from './pages/TradingRulesPage'
import FxRatesPage from './pages/FxRatesPage'
import CTraderPage from './pages/CTraderPage'
import SendAnnouncementPage from './pages/SendAnnouncementPage'
import SalaryPage from './pages/SalaryPage'
import {
  adminLoginWithBackend,
  clearPersistedAdminUser,
  fetchAdminMe,
  getPersistedAdminUser,
  logoutAdmin,
  persistAdminUser,
  type AdminAuthMeResponse,
} from './lib/adminApi'
import AdminSupabaseAuthCard from './components/AdminSupabaseAuthCard'
import { supabase } from './lib/supabaseClient'
import './App.css'

type AdminPage = 'analysis' | 'users' | 'accounts' | 'fundedAccounts' | 'breaches' | 'orders' | 'payouts' | 'userProfile' | 'kycReview' | 'referrals' | 'financeAnalysis' | 'coupons' | 'supportTickets' | 'settings' | 'mt5' | 'sendAnnouncement' | 'salary' | 'tradingRules' | 'fxRates'

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
  // Supabase handles session refresh internally
  const [activePage, setActivePage] = useState<AdminPage>('analysis')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [authUser, setAuthUser] = useState<AdminAuthMeResponse | null>(getPersistedAdminUser())
  const [authLoading, setAuthLoading] = useState(true)
  const [authSyncing, setAuthSyncing] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authRetryKey, setAuthRetryKey] = useState(0)
  const [authBlocked, setAuthBlocked] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [supportChatId, setSupportChatId] = useState<string | null>(null)

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        localStorage.setItem('supabase_access_token', session.access_token)
      }
    })

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

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

    const possiblePages = ['analysis', 'users', 'accounts', 'fundedAccounts', 'breaches', 'orders', 'payouts', 'kycReview', 'referrals', 'financeAnalysis', 'coupons', 'supportTickets', 'settings', 'mt5', 'sendAnnouncement', 'salary', 'tradingRules', 'fxRates'];
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

  const handleSupabaseSuccess = async () => {
    setAuthError('')
    setAuthSyncing(true)

    try {
      const user = await adminLoginWithBackend()
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

  const handleSupabaseError = (message: string) => {
    setAuthError(readableAuthError(message))
  }

  const handleOpenUserProfile = (user: AdminUser) => {
    setSelectedUser(user)
    setActivePage('userProfile')
  }

  const handleOpenSupportChat = (chatId: string) => {
    setSupportChatId(chatId)
    setActivePage('supportTickets')
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
      await supabase.auth.signOut()
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
          <img src="/logo.png" alt="Machefunded" className="admin-auth-logo" />
          <h1>Admin Sign In</h1>

          <AdminSupabaseAuthCard
            key={authRetryKey}
            onAuthenticated={handleSupabaseSuccess}
            onError={handleSupabaseError}
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
          {!authError && activePage === 'analysis' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('analysis'))) && <DashboardPage />}
          {!authError && activePage === 'users' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('users'))) && <UsersPage onOpenProfile={handleOpenUserProfile} />}
          {!authError && activePage === 'accounts' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('accounts'))) && <AccountsPage onOpenProfile={handleOpenUserProfile} />}
          {!authError && activePage === 'fundedAccounts' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('fundedAccounts'))) && <FundedAccountsPage onOpenProfile={handleOpenUserProfile} />}
          {!authError && activePage === 'breaches' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('breaches'))) && <BreachesPage onOpenProfile={handleOpenUserProfile} />}
          {!authError && activePage === 'mt5' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('mt5'))) && (
            <CTraderPage
              isSuperAdmin={authUser.role === 'super_admin'}
              canAssignMt5={Boolean(authUser.can_assign_mt5)}
            />
          )}
          {!authError && activePage === 'orders' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('orders'))) && (
            <OrdersPage onOpenProfile={handleOpenUserProfile} isSuperAdmin={authUser.role === 'super_admin'} />
          )}
          {!authError && activePage === 'payouts' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('payouts'))) && (
            <PayoutsPage onOpenProfile={handleOpenUserProfile} />
          )}
          {!authError && activePage === 'financeAnalysis' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('financeAnalysis'))) && <FinanceAnalysisPage />}
          {!authError && activePage === 'coupons' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('coupons'))) && <CouponsPage />}
          {!authError && activePage === 'sendAnnouncement' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('sendAnnouncement'))) && <SendAnnouncementPage />}
          {!authError && activePage === 'salary' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('salary'))) && <SalaryPage />}
          {!authError && activePage === 'supportTickets' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('supportTickets'))) && (
            <SupportTicketsPage
              onOpenProfile={handleOpenUserProfile}
              initialChatId={supportChatId}
              onChatOpened={() => setSupportChatId(null)}
            />
          )}
          {!authError && activePage === 'settings' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('settings'))) && <SettingsPage />}
          {!authError && activePage === 'tradingRules' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('tradingRules'))) && <TradingRulesPage />}
          {!authError && activePage === 'fxRates' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('fxRates'))) && <FxRatesPage />}
          {!authError && activePage === 'kycReview' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('kycReview'))) && <KycReviewPage />}
          {!authError && activePage === 'referrals' && (authUser.role === 'super_admin' || (authUser.allowed_pages?.includes('referrals'))) && <ReferralsPage />}
          {!authError && activePage === 'userProfile' && selectedUser && (
            <UserProfilePage
              user={selectedUser}
              onBack={handleBackToUsers}
              onOpenSupportChat={handleOpenSupportChat}
            />
          )}
          {!authError && !['analysis', 'users', 'accounts', 'fundedAccounts', 'breaches', 'mt5', 'orders', 'payouts', 'financeAnalysis', 'coupons', 'sendAnnouncement', 'supportTickets', 'settings', 'kycReview', 'referrals', 'userProfile', 'salary', 'tradingRules', 'fxRates'].includes(activePage) && (
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