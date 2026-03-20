import React from 'react'
import { useNavigate } from 'react-router-dom'

interface AccountProps {
  challengeId: string;
  challengeType?: string | undefined;
  phase: string;
  accountNumber: string;
  startDate: string;
  amount: string;
  status: 'Active' | 'Ready' | 'Passed' | 'Failed';
  passedStage?: string | null;
  hasPendingWithdrawal?: boolean | undefined;
}

const DesktopAccountCard: React.FC<AccountProps> = ({ challengeId, challengeType, phase, accountNumber, startDate, amount, status, passedStage, hasPendingWithdrawal }) => {
  const navigate = useNavigate()

  const formatChallengeType = (value?: string) => {
    if (!value) return null
    const normalized = value.replace(/-/g, '_').toLowerCase()
    switch (normalized) {
      case 'two_step':
      case 'challenge':
        return '2 Step Challenge'
      case 'one_step':
        return '1 Step Challenge'
      case 'instant_funded':
        return 'Instant Funded'
      case 'funded':
        return 'Funded'
      case 'assigned_pending_access':
        return '2 Step Challenge'
      default:
        return value
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase())
    }
  }

  const formatPhase = (value?: string) => {
    if (!value) return ''
    const normalized = value.replace(/-/g, '_').toLowerCase()
    if (normalized === 'phase_1' || normalized === 'phase1') return 'Phase 1'
    if (normalized === 'phase_2' || normalized === 'phase2') return 'Phase 2'
    if (normalized === 'funded') return 'Funded'
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const challengeLabel = formatChallengeType(challengeType)
  const phaseLabel = formatPhase(phase)
  const passedLabel = formatPhase(passedStage ?? undefined)

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
    navigate(`/account-overview?challenge_id=${encodeURIComponent(challengeId)}`)
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
          {hasPendingWithdrawal && (
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#b45309',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              backgroundColor: 'rgba(251, 191, 36, 0.2)',
              padding: '4px 8px',
              borderRadius: '12px',
              border: '1px solid rgba(251, 191, 36, 0.5)'
            }}>
              Pending Withdrawal
            </div>
          )}
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#333'
          }}>
            {(challengeLabel ? `${challengeLabel} · ` : '')}{phaseLabel} · {accountNumber}
            {passedStage && (
              <div style={{
                fontSize: '12px',
                fontWeight: '500',
                color: '#27ae60',
                marginTop: '2px'
              }}>
                ✓ {passedLabel || passedStage} Passed
              </div>
            )}
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
              fontSize: '14px',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              border: '1px solid rgba(52, 152, 219, 0.2)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/credentials?challenge_id=${encodeURIComponent(challengeId)}`);
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(52, 152, 219, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(52, 152, 219, 0.1)'}
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
              fontSize: '14px',
              backgroundColor: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid rgba(231, 76, 60, 0.2)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/account-overview?challenge_id=${encodeURIComponent(challengeId)}`);
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)'}
          >
            <i className="fas fa-chart-bar" style={{fontSize: '14px'}}></i>
            <span>Account Metrics</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesktopAccountCard