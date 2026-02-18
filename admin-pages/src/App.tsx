import { useState } from 'react'
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
import './App.css'

type AdminPage = 'analysis' | 'users' | 'accounts' | 'fundedAccounts' | 'breaches' | 'orders' | 'payouts' | 'userProfile' | 'kycReview' | 'referrals' | 'financeAnalysis' | 'coupons' | 'supportTickets' | 'settings' | 'workBoard' | 'mt5' | 'sendAnnouncement'

function App() {
  const [activePage, setActivePage] = useState<AdminPage>('analysis')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  const handleOpenUserProfile = (user: AdminUser) => {
    setSelectedUser(user)
    setActivePage('userProfile')
  }

  const handleBackToUsers = () => {
    setActivePage('users')
  }

  return (
    <div className="admin-dashboard-page">
      <AdminHeader />

      <div className="admin-dashboard-body">
        <AdminSidebar activePage={activePage} onNavigate={setActivePage} />

        <main className="admin-dashboard-content">
          {activePage === 'analysis' && <DashboardPage onNavigate={setActivePage} />}
          {activePage === 'workBoard' && <WorkBoardPage />}
          {activePage === 'users' && <UsersPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'accounts' && <AccountsPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'fundedAccounts' && <FundedAccountsPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'breaches' && <BreachesPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'mt5' && <MT5Page />}
          {activePage === 'orders' && <OrdersPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'payouts' && <PayoutsPage />}
          {activePage === 'financeAnalysis' && <FinanceAnalysisPage />}
          {activePage === 'coupons' && <CouponsPage />}
          {activePage === 'sendAnnouncement' && <SendAnnouncementPage />}
          {activePage === 'supportTickets' && <SupportTicketsPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'settings' && <SettingsPage />}
          {activePage === 'kycReview' && <KycReviewPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'referrals' && <ReferralsPage onOpenProfile={handleOpenUserProfile} />}
          {activePage === 'userProfile' && selectedUser && (
            <UserProfilePage user={selectedUser} onBack={handleBackToUsers} />
          )}
        </main>
      </div>

      <AdminFooter />
    </div>
  )
}

export default App
