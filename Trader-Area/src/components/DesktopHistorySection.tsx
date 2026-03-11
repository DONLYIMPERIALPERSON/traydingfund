import React, { useState } from 'react'
import DesktopAccountCard from './DesktopAccountCard'
import type { UserChallengeAccountListItem } from '../lib/auth'

type DesktopHistorySectionProps = {
  accounts: UserChallengeAccountListItem[]
}

const DesktopHistorySection: React.FC<DesktopHistorySectionProps> = ({ accounts }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 2
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
        {accounts.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '20px', color: '#666' }}>
            No account history yet.
          </div>
        ) : (
          <>
            {currentAccounts.map((account) => (
              <DesktopAccountCard
                key={account.challenge_id}
                challengeId={account.challenge_id}
                phase={account.phase}
                accountNumber={account.mt5_account ?? 'Pending'}
                startDate={account.started_at ? new Date(account.started_at).toLocaleDateString() : '-'}
                amount={account.account_size}
                status={(account.display_status as 'Active' | 'Ready' | 'Passed' | 'Failed')}
                passedStage={account.passed_stage}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                marginTop: '16px',
                padding: '16px',
                background: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '12px'
              }}>
                <button
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: currentPage === 1 ? '#f8f9fa' : 'white',
                    color: currentPage === 1 ? '#ccc' : '#333',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fas fa-chevron-left" style={{ marginRight: '4px' }}></i>
                  Previous
                </button>

                <span style={{
                  fontSize: '14px',
                  color: '#666',
                  fontWeight: '500'
                }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: currentPage === totalPages ? '#f8f9fa' : 'white',
                    color: currentPage === totalPages ? '#ccc' : '#333',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Next
                  <i className="fas fa-chevron-right" style={{ marginLeft: '4px' }}></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DesktopHistorySection