import React from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileActiveAccountList.css'

interface AccountProps {
  phase: string;
  accountNumber: string;
  startDate: string;
  amount: string;
  status: 'Active' | 'Ready' | 'Passed' | 'Failed';
}

const MobileActiveAccountList: React.FC<AccountProps> = ({ phase, accountNumber, startDate, amount, status }) => {
  const navigate = useNavigate()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return '#2ecc71';
      case 'Ready': return '#f39c12';
      case 'Passed': return '#27ae60';
      case 'Failed': return '#e74c3c';
      default: return '#2ecc71';
    }
  };

  const handleClick = () => {
    navigate('/account-details')
  }

  return (
    <div className="primary-account-card" onClick={handleClick} style={{cursor: 'pointer'}}>
      <div className="account-content-row">
        <div className="account-left">
          <div className="icon-column">
            <i className="fas fa-flag"></i>
          </div>
          <div className="text-column">
            <div className="phase-info">{phase}</div>
            <div className="account-details">
              <span>{accountNumber}</span>
              <span>·</span>
              <span>{startDate}</span>
            </div>
          </div>
        </div>
        <div className="account-right">
          <div className="account-amount">{amount}</div>
          <div className="account-status">
            <span className="status-dot" style={{ background: getStatusColor(status) }}></span>
            <span>{status}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileActiveAccountList
