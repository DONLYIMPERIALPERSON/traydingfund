import './AdminHeader.css'

type AdminHeaderProps = {
  roleLabel?: string
  fullName?: string
}

const AdminHeader = ({ roleLabel = 'Admin', fullName }: AdminHeaderProps) => {
  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <img src="/logo.webp" alt="MacheFunded" className="admin-header-logo" />
        <span className="admin-header-wordmark">
          <span className="admin-header-wordmark-accent">MACHE</span>
          <span className="admin-header-wordmark-base">FUNDED</span>
        </span>
      </div>
      <div className="admin-header-right">
        {fullName ? <span className="admin-header-email">{fullName}</span> : null}
        <span className="admin-header-badge">{roleLabel}</span>
      </div>
    </header>
  )
}

export default AdminHeader
