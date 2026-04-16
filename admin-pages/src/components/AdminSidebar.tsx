import './AdminSidebar.css'

type AdminPage = 'analysis' | 'users' | 'accounts' | 'adminChecking' | 'fundedAccounts' | 'breaches' | 'orders' | 'payouts' | 'kycReview' | 'accountRecovery' | 'referrals' | 'userProfile' | 'financeAnalysis' | 'coupons' | 'supportTickets' | 'settings' | 'mt5' | 'sendAnnouncement' | 'salary' | 'tradingRules' | 'fxRates'

interface AdminSidebarProps {
  activePage: AdminPage
  onNavigate: (page: AdminPage) => void
  onLogout: () => void
  isLoggingOut: boolean
  allowedPages?: string[]
  userRole?: string
}

const AdminSidebar = ({ activePage, onNavigate, onLogout, isLoggingOut, allowedPages, userRole }: AdminSidebarProps) => {
  // Super admins have access to all pages
  const hasAccess = (pageId: string) => {
    if (userRole === 'super_admin') return true
    if (!allowedPages || allowedPages.length === 0) return true // No restrictions
    return allowedPages.includes(pageId)
  }

  return (
    <aside className="admin-sidebar">
      <nav className="admin-sidebar-nav">
        {hasAccess('analysis') && (
          <button
            className={`admin-sidebar-item ${activePage === 'analysis' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('analysis')}
          >
            Analysis
          </button>
        )}
        <div className="admin-sidebar-group">
          <p className="admin-sidebar-group-title">Users</p>
          {hasAccess('users') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'users' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('users')}
            >
              All Users
            </button>
          )}
          {hasAccess('kycReview') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'kycReview' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('kycReview')}
            >
              KYC Review
            </button>
          )}
          {hasAccess('accountRecovery') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'accountRecovery' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('accountRecovery')}
            >
              Account Recovery
            </button>
          )}
          {hasAccess('referrals') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'referrals' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('referrals')}
            >
              Affiliates
            </button>
          )}
        </div>

        <div className="admin-sidebar-group">
          <p className="admin-sidebar-group-title">Finance</p>
          {hasAccess('payouts') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'payouts' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('payouts')}
            >
              Payout Requests
            </button>
          )}
          {hasAccess('orders') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'orders' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('orders')}
            >
              Orders
            </button>
          )}
          {hasAccess('salary') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'salary' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('salary')}
            >
              Salary
            </button>
          )}
          {hasAccess('financeAnalysis') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'financeAnalysis' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('financeAnalysis')}
            >
              Financial Analysis & Settings
            </button>
          )}
          {hasAccess('fxRates') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'fxRates' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('fxRates')}
            >
              FX Rates
            </button>
          )}
        </div>

        <div className="admin-sidebar-group">
          <p className="admin-sidebar-group-title">Accounts</p>
          {hasAccess('accounts') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'accounts' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('accounts')}
            >
              Challenges
            </button>
          )}
          {hasAccess('adminChecking') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'adminChecking' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('adminChecking')}
            >
              Admin Checking
            </button>
          )}
          {hasAccess('fundedAccounts') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'fundedAccounts' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('fundedAccounts')}
            >
              Funded Accounts
            </button>
          )}
          {hasAccess('breaches') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'breaches' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('breaches')}
            >
              Breaches
            </button>
          )}
          {hasAccess('mt5') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'mt5' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('mt5')}
            >
              Accounts Pool
            </button>
          )}
          {hasAccess('tradingRules') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'tradingRules' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('tradingRules')}
            >
              Trading Rules
            </button>
          )}
        </div>

        <div className="admin-sidebar-group">
          <p className="admin-sidebar-group-title">Prop Firm Ops</p>
          {hasAccess('coupons') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'coupons' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('coupons')}
            >
              Coupons
            </button>
          )}
          {hasAccess('supportTickets') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'supportTickets' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('supportTickets')}
            >
              Support Tickets
            </button>
          )}
          {hasAccess('sendAnnouncement') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'sendAnnouncement' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('sendAnnouncement')}
            >
              Send Announcement
            </button>
          )}
          {hasAccess('settings') && (
            <button
              className={`admin-sidebar-subitem ${activePage === 'settings' ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate('settings')}
            >
              Settings
            </button>
          )}
        </div>

        <div className="admin-sidebar-group">
          <button className="admin-sidebar-logout" type="button" onClick={onLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </nav>
    </aside>
  )
}

export default AdminSidebar
