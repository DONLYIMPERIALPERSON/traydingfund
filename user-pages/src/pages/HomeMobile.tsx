import React from 'react'
import MobileHomeHeader from '../components/MobileHomeHeader'
import MobileActiveAccountList from '../components/MobileActiveAccountList'
import MobileHiddenAccountList from '../components/MobileHiddenAccountList'
import BottomNav from '../components/BottomNav'
import '../styles/Home.css'

const HomeMobile: React.FC = () => {
  return (
    <div style={{backgroundColor: '#000000', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '0 12px 16px', minHeight: '100vh', color: 'white', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale'}}>
      <MobileHomeHeader />
      <div style={{maxWidth: '400px', width: '100%', margin: '0 auto', paddingTop: '80px'}}>
        <div style={{textAlign: 'left', fontSize: '12px', color: 'white', marginBottom: '8px', fontWeight: '600'}}>Active</div>
        <MobileActiveAccountList
          phase="Phase 1"
          accountNumber="210275116"
          startDate="6 Feb 2024"
          amount="N100,000"
          status="Active"
        />
        <MobileActiveAccountList
          phase="Funded"
          accountNumber="210275117"
          startDate="10 Feb 2024"
          amount="N200,000"
          status="Active"
        />
        <MobileHiddenAccountList />
      </div>
      <BottomNav />
    </div>
  )
}

export default HomeMobile
