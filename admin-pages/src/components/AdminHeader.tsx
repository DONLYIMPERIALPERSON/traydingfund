import './AdminHeader.css'

const AdminHeader = () => {
  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <img src="/white-logo.svg" alt="NairaTrader" className="admin-header-logo" />
      </div>
      <div className="admin-header-right">
        <span className="admin-header-badge">Super Admin</span>
      </div>
    </header>
  )
}

export default AdminHeader
