import React, { useState } from 'react'
import MobileActiveAccountList from './MobileActiveAccountList'
import '../styles/MobileHiddenAccountList.css'
import type { UserChallengeAccountListItem } from '../lib/auth'

type MobileHiddenAccountListProps = {
  accounts: UserChallengeAccountListItem[]
}

const MobileHiddenAccountList: React.FC<MobileHiddenAccountListProps> = ({ accounts }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4
  const totalPages = Math.ceil(accounts.length / itemsPerPage)

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentAccounts = accounts.slice(startIndex, endIndex)

  const handlePrevious = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }

  const handleNext = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }

  return (
    <div className="hidden-accounts-section">
      <input type="checkbox" id="toggle-hidden-mobile" style={{display: 'none'}} />
      <label htmlFor="toggle-hidden-mobile" className="hidden-accounts-trigger">
        <div className="trigger-left">
          <i className="fas fa-eye-slash"></i>
          <span>Hidden accounts</span>
        </div>
        <div className="trigger-right">
          <span className="hidden-count">{accounts.length}</span>
          <i className="fas fa-chevron-down"></i>
        </div>
      </label>
      <div className="hidden-accounts-list">
        {accounts.length === 0 ? (
          <div className="hidden-account-item">
            <div className="hidden-account-info">
              <div className="hidden-account-title">
                <span className="hidden-account-number">No hidden accounts yet</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {currentAccounts.map((account) => (
              <MobileActiveAccountList
                key={account.challenge_id}
                challengeId={account.challenge_id}
                phase={account.phase}
                accountNumber={account.mt5_account ?? 'Pending'}
                startDate={account.started_at ? new Date(account.started_at).toLocaleDateString() : '-'}
                amount={account.account_size}
                status={(account.display_status as 'Active' | 'Ready' | 'Passed' | 'Failed')}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px'
              }}>
                <button
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    background: currentPage === 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                    color: currentPage === 1 ? 'rgba(255,255,255,0.4)' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>

                <span style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: '500'
                }}>
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    background: currentPage === totalPages ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                    color: currentPage === totalPages ? 'rgba(255,255,255,0.4)' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default MobileHiddenAccountList
