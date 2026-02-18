import React from 'react'
import MobileActiveAccountList from './MobileActiveAccountList'
import '../styles/MobileHiddenAccountList.css'

const MobileHiddenAccountList: React.FC = () => {
  return (
    <div className="hidden-accounts-section">
      <input type="checkbox" id="toggle-hidden-mobile" style={{display: 'none'}} />
      <label htmlFor="toggle-hidden-mobile" className="hidden-accounts-trigger">
        <div className="trigger-left">
          <i className="fas fa-eye-slash"></i>
          <span>Hidden accounts</span>
        </div>
        <div className="trigger-right">
          <span className="hidden-count">3</span>
          <i className="fas fa-chevron-down"></i>
        </div>
      </label>
      <div className="hidden-accounts-list">
        <MobileActiveAccountList
          phase="Ready"
          accountNumber="42719035"
          startDate="15 Jan 2024"
          amount="N25,000"
          status="Ready"
        />
        <MobileActiveAccountList
          phase="Passed"
          accountNumber="67289451"
          startDate="20 Mar 2024"
          amount="N50,000"
          status="Passed"
        />
        <MobileActiveAccountList
          phase="Failed"
          accountNumber="12345678"
          startDate="5 Dec 2023"
          amount="N10,000"
          status="Failed"
        />
      </div>
    </div>
  )
}

export default MobileHiddenAccountList
