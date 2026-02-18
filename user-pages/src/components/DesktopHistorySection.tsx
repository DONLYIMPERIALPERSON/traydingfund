import React from 'react'
import DesktopAccountCard from './DesktopAccountCard'

const DesktopHistorySection: React.FC = () => {
  return (
    <div>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '20px'
      }}>
        History
      </h2>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <DesktopAccountCard
          phase="Phase 1"
          accountNumber="42719035"
          startDate="15 Jan 2024"
          amount="N25,000"
          status="Passed"
        />
        <DesktopAccountCard
          phase="Phase 2"
          accountNumber="67289451"
          startDate="20 Mar 2024"
          amount="N50,000"
          status="Passed"
        />
        <DesktopAccountCard
          phase="Phase 1"
          accountNumber="12345678"
          startDate="5 Dec 2023"
          amount="N10,000"
          status="Failed"
        />
        <DesktopAccountCard
          phase="Phase 3"
          accountNumber="99887766"
          startDate="1 Nov 2023"
          amount="N75,000"
          status="Passed"
        />
      </div>
    </div>
  )
}

export default DesktopHistorySection