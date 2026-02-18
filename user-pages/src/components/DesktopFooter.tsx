import React from 'react'

const DesktopFooter: React.FC = () => {
  return (
    <footer style={{
      backgroundColor: '#f8f9fa',
      borderTop: '1px solid #e0e0e0',
      padding: '20px 0',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        textAlign: 'right'
      }}>
        <p style={{
          fontSize: '14px',
          color: '#666',
          margin: '0',
          fontWeight: '500'
        }}>
          Copyright © 2026 by NairaTrader.is
        </p>
      </div>
    </footer>
  )
}

export default DesktopFooter