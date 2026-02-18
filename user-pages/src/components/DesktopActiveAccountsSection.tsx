import React from 'react'
import DesktopAccountCard from './DesktopAccountCard'

const DesktopActiveAccountsSection: React.FC = () => {
  return (
    <div style={{
      marginBottom: '48px'
    }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '20px'
      }}>
        Active Accounts
      </h2>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <DesktopAccountCard
          phase="Phase 1"
          accountNumber="12345678"
          startDate="15 Jan 2024"
          amount="N25,000"
          status="Active"
        />
        <DesktopAccountCard
          phase="Phase 2"
          accountNumber="87654321"
          startDate="20 Feb 2024"
          amount="N50,000"
          status="Active"
        />
      </div>
    </div>
  )
}

export default DesktopActiveAccountsSection