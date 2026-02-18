import React from 'react'
import { useNavigate } from 'react-router-dom'

const DesktopHeader: React.FC = () => {
  const navigate = useNavigate()

  const handleLogout = () => {
    // Handle logout logic here
    console.log('Logout clicked')
    // For now, just navigate to home or show a message
    // In a real app, this would clear authentication tokens, etc.
  }

  return (
    <header style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      backgroundColor: 'white',
      borderBottom: '1px solid #e0e0e0',
      padding: '20px 12px',
      zIndex: '1000',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end'
    }}>
      {/* Right: Only Logout Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end'
      }}>
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