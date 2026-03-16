import { useMemo, useState } from 'react'
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
import CTraderPage from './pages/CTraderPage'
import SendAnnouncementPage from './pages/SendAnnouncementPage'
import SalaryPage from './pages/SalaryPage'
import './App.css'

type AdminPage =
  | 'analysis'
  | 'users'
  | 'accounts'
  | 'fundedAccounts'
  | 'breaches'
  | 'orders'
  | 'payouts'
  | 'userProfile'
  | 'kycReview'
  | 'referrals'
  | 'financeAnalysis'
  | 'coupons'
  | 'supportTickets'
  | 'settings'
  | 'mt5'
  | 'sendAnnouncement'
  | 'salary'

const mockAdminUser = {
  email: 'admin@machefunded.com',
  full_name: 'Admin Operator',
  role: 'super_admin',
  allowed_pages: [
    'analysis',
    'users',
    'accounts',
    'fundedAccounts',
    'breaches',
    'orders',
    'payouts',
    'kycReview',
    'referrals',
    'financeAnalysis',
    'coupons',
    'supportTickets',
    'settings',
    'mt5',
    'sendAnnouncement',
    'salary',
  ],
  can_assign_mt5: true,
}

const AppMock = () => {
  const [activePage, setActivePage] = useState<AdminPage>('analysis')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [supportChatId, setSupportChatId] = useState<string | null>(null)

  const roleLabel = useMemo(() => {
    return mockAdminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'
  }, [])

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

  return (
    <div className="admin-dashboard-page">
      <AdminHeader roleLabel={roleLabel} fullName={mockAdminUser.full_name || mockAdminUser.email} />

      <div className="admin-dashboard-body">
        <AdminSidebar
          activePage={activePage}
          onNavigate={setActivePage}
          onLogout={() => {
            // noop for mock
          }}
          isLoggingOut={false}
          allowedPages={mockAdminUser.allowed_pages}
          userRole={mockAdminUser.role}
        />

        <main className="admin-dashboard-content">
          {activePage === 'analysis' && <DashboardPage onNavigate={setActivePage} />}
          {activePage === 'users' && <UsersPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'accounts' && <AccountsPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'fundedAccounts' && <FundedAccountsPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'breaches' && <BreachesPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'mt5' && (
            <CTraderPage isSuperAdmin={mockAdminUser.role === 'super_admin'} canAssignMt5={Boolean(mockAdminUser.can_assign_mt5)} />
          )}
          {activePage === 'orders' && <OrdersPage onOpenProfile={handleOpenUserProfile} isSuperAdmin />}
          {activePage === 'payouts' && <PayoutsPage onOpenProfile={handleOpenUserProfile} isSuperAdmin />}
          {activePage === 'financeAnalysis' && <FinanceAnalysisPage />}
          {activePage === 'coupons' && <CouponsPage />}
          {activePage === 'sendAnnouncement' && <SendAnnouncementPage />}
          {activePage === 'salary' && <SalaryPage />}
          {activePage === 'supportTickets' && (
            <SupportTicketsPage
              onOpenProfile={handleOpenUserProfile}
              initialChatId={supportChatId}
              onChatOpened={() => setSupportChatId(null)}
            />
          )}
          {activePage === 'settings' && <SettingsPage />}
          {activePage === 'kycReview' && <KycReviewPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'referrals' && <ReferralsPage />}
          {activePage === 'userProfile' && selectedUser && (
            <UserProfilePage
              user={selectedUser}
              onBack={handleBackToUsers}
              onOpenSupportChat={handleOpenSupportChat}
            />
          )}
        </main>
      </div>

      <AdminFooter />
    </div>
  )
}

export default AppMock