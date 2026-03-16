import React from 'react'
import { useNavigate } from 'react-router-dom'
import { clearPersistedAuthUser, logoutFromBackend } from '../mocks/auth'
import { useSidebar } from '../contexts/SidebarContext'

const DesktopHeader: React.FC = () => {
  const navigate = useNavigate()
  const { toggleMobileSidebar, isMobileOpen } = useSidebar()
  const handleLogout = async () => {
    try {
      await logoutFromBackend()
    } catch (error) {
      console.warn('Backend logout call failed:', error)
    }

    clearPersistedAuthUser()
    navigate('/login')
  }

  return (
    <header style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      backgroundColor: 'white',
      borderBottom: '1px solid #e0e0e0',
      padding: '16px 12px',
      zIndex: '1000',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="header-logo" style={{ display: 'none', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.webp" alt="MacheFunded" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} />
          <div style={{ fontSize: '14px', fontWeight: 700 }}>
            <span style={{ color: '#008ea4' }}>MACHE</span>
            <span style={{ color: '#111' }}>FUNDED</span>
          </div>
        </div>
      </div>

      <div className="header-logout" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '12px'
      }}>
        <button
          className="mobile-hamburger"
          onClick={toggleMobileSidebar}
          style={{
            background: 'transparent',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '8px 10px',
            cursor: 'pointer',
            display: 'none'
          }}
          aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
        >
          <i className={`fas ${isMobileOpen ? 'fa-xmark' : 'fa-bars'}`} style={{ fontSize: '16px', color: '#333' }}></i>
        </button>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
        >
          <i className="fas fa-sign-out-alt" style={{fontSize: '12px'}}></i>
          Logout
        </button>
      </div>
    </header>
  )
}

export default DesktopHeader