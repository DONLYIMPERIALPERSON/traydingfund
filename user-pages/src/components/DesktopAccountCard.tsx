import React from 'react'
import { useNavigate } from 'react-router-dom'

interface AccountProps {
  phase: string;
  accountNumber: string;
  startDate: string;
  amount: string;
  status: 'Active' | 'Ready' | 'Passed' | 'Failed';
}

const DesktopAccountCard: React.FC<AccountProps> = ({ phase, accountNumber, startDate, amount, status }) => {
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
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '16px'
      }}
      onClick={handleClick}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* Top Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: getStatusColor(status),
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            backgroundColor: `${getStatusColor(status)}20`,
            padding: '4px 8px',
            borderRadius: '12px',
            border: `1px solid ${getStatusColor(status)}40`
          }}>
            {status}
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#333'
          }}>
            {phase} · {accountNumber}
          </div>
        </div>
      </div>

      {/* Divider Line */}
      <div style={{
        height: '1px',
        backgroundColor: '#e0e0e0',
        marginBottom: '12px'
      }}></div>

      {/* Bottom Row */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#333'
            }}>
              {amount}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#666'
            }}>
              {startDate}
            </div>
          </div>
        </div>

        {/* Action Icons with Labels */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              color: '#666',
              fontSize: '14px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              navigate('/credentials');
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <i className="fas fa-key" style={{fontSize: '14px'}}></i>
            <span>Credentials</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              color: '#666',
              fontSize: '14px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              navigate('/account-overview');
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <i className="fas fa-chart-bar" style={{fontSize: '14px'}}></i>
            <span>Account Metrics</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              color: '#666',
              fontSize: '14px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              navigate('/statistics');
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <i className="fas fa-chart-pie" style={{fontSize: '14px'}}></i>
            <span>Analysis</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesktopAccountCard