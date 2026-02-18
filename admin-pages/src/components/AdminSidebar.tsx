import './AdminSidebar.css'

type AdminPage = 'analysis' | 'users' | 'accounts' | 'fundedAccounts' | 'breaches' | 'orders' | 'payouts' | 'kycReview' | 'referrals' | 'userProfile' | 'financeAnalysis' | 'coupons' | 'supportTickets' | 'settings' | 'workBoard' | 'mt5' | 'sendAnnouncement'

interface AdminSidebarProps {
  activePage: AdminPage
  onNavigate: (page: AdminPage) => void
}

const AdminSidebar = ({ activePage, onNavigate }: AdminSidebarProps) => {
  return (
    <aside className="admin-sidebar">
      <nav className="admin-sidebar-nav">
        <button
          className={`admin-sidebar-item ${activePage === 'analysis' ? 'active' : ''}`}
          type="button"
          onClick={() => onNavigate('analysis')}
        >
          Analysis
        </button>
        <button
          className={`admin-sidebar-item ${activePage === 'workBoard' ? 'active' : ''}`}
          type="button"
          onClick={() => onNavigate('workBoard')}
        >
          Work Board
        </button>

        <div className="admin-sidebar-group">
          <p className="admin-sidebar-group-title">Users</p>
          <button
            className={`admin-sidebar-subitem ${activePage === 'users' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('users')}
          >
            All Users
          </button>
          <button
            className={`admin-sidebar-subitem ${activePage === 'kycReview' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('kycReview')}
          >
            KYC Review
          </button>
          <button
            className={`admin-sidebar-subitem ${activePage === 'referrals' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('referrals')}
          >
            Affiliates
          </button>
        </div>

        <div className="admin-sidebar-group">
          <p className="admin-sidebar-group-title">Finance</p>
          <button
            className={`admin-sidebar-subitem ${activePage === 'payouts' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('payouts')}
          >
            Payout Requests
          </button>
          <button
            className={`admin-sidebar-subitem ${activePage === 'orders' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('orders')}
          >
            Orders
          </button>
          <button
            className={`admin-sidebar-subitem ${activePage === 'financeAnalysis' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('financeAnalysis')}
          >
            Financial Analysis & Settings
          </button>
        </div>

        <div className="admin-sidebar-group">
          <p className="admin-sidebar-group-title">Accounts</p>
          <button
            className={`admin-sidebar-subitem ${activePage === 'accounts' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('accounts')}
          >
            Challenges
          </button>
          <button
            className={`admin-sidebar-subitem ${activePage === 'fundedAccounts' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('fundedAccounts')}
          >
            Funded Accounts
          </button>
          <button
            className={`admin-sidebar-subitem ${activePage === 'breaches' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('breaches')}
          >
            Breaches
          </button>
          <button
            className={`admin-sidebar-subitem ${activePage === 'mt5' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('mt5')}
          >
            MT5
          </button>
        </div>

        <div className="admin-sidebar-group">
          <p className="admin-sidebar-group-title">Prop Firm Ops</p>
          <button
            className={`admin-sidebar-subitem ${activePage === 'coupons' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('coupons')}
          >
            Coupons
          </button>
          <button
            className={`admin-sidebar-subitem ${activePage === 'supportTickets' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('supportTickets')}
          >
            Support Tickets
          </button>
          <button
            className={`admin-sidebar-subitem ${activePage === 'sendAnnouncement' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('sendAnnouncement')}
          >
            Send Announcement
          </button>
          <button
            className={`admin-sidebar-subitem ${activePage === 'settings' ? 'active' : ''}`}
            type="button"
            onClick={() => onNavigate('settings')}
          >
            Settings
          </button>
        </div>
      </nav>
    </aside>
  )
}

export default AdminSidebar
