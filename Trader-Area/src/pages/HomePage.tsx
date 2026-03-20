import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopActiveAccountsSection from '../components/DesktopActiveAccountsSection'
import DesktopHistorySection from '../components/DesktopHistorySection'
import DesktopFooter from '../components/DesktopFooter'
import { fetchUserChallengeAccounts, type UserChallengeAccountListItem } from '../mocks/auth'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [accountLoadError, setAccountLoadError] = useState('')
  const [activeAccounts, setActiveAccounts] = useState<UserChallengeAccountListItem[]>([])
  const [historyAccounts, setHistoryAccounts] = useState<UserChallengeAccountListItem[]>([])
  const [hasAnyAccounts, setHasAnyAccounts] = useState(false)

  useEffect(() => {
    setLoadingAccounts(true)
    setAccountLoadError('')
    fetchUserChallengeAccounts()
      .then((res) => {
        setActiveAccounts(res.active_accounts)
        setHistoryAccounts(res.history_accounts)
        setHasAnyAccounts(res.has_any_accounts)
      })
      .catch((err: unknown) => {
        setAccountLoadError(err instanceof Error ? err.message : 'Unable to load accounts')
      })
      .finally(() => setLoadingAccounts(false))
  }, [])

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      minHeight: '100vh'
    }}>
      <DesktopHeader />
      <DesktopSidebar />
      <div className="home-desktop-content" style={{
        marginLeft: '280px', // Account for sidebar
        padding: '24px',
        paddingTop: '80px', // Add top padding to avoid header overlap
        minHeight: '100vh'
      }}>
        {/* Page Header */}
        <div className="home-desktop-header" style={{
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div className="home-desktop-header-text">
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#333',
              marginBottom: '8px'
            }}>
              Accounts Overview
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#666'
            }}>
              Manage and monitor your trading accounts
            </p>
          </div>
          <div className="home-desktop-cta">
            <button
              onClick={() => window.location.href = '/trading-accounts'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#0b9fb8',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#FFFFFF',
                fontWeight: '600',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(11,159,184,0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#008ea4';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(11,159,184,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0b9fb8';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(11,159,184,0.3)';
              }}
            >
              <i className="fas fa-plus" style={{fontSize: '14px'}}></i>
              Start a Challenge
            </button>
          </div>
        </div>

        {loadingAccounts ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '20px', color: '#666' }}>
            Loading accounts...
          </div>
        ) : accountLoadError ? (
          <div style={{ background: 'white', border: '1px solid #f1b0b7', borderRadius: '12px', padding: '20px', color: '#721c24' }}>
            {accountLoadError}
          </div>
        ) : !hasAnyAccounts ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '32px' }}>
            <h3 style={{ margin: 0, color: '#333' }}>No account yet</h3>
            <p style={{ marginTop: '10px', color: '#666' }}>You have not started any challenge account yet.</p>
            <button
              onClick={() => navigate('/trading-accounts')}
              style={{
                marginTop: '16px',
                backgroundColor: '#0b9fb8',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#FFFFFF',
                boxShadow: '0 2px 4px rgba(11,159,184,0.3)'
              }}
            >
              Start New Challenge
            </button>
          </div>
        ) : (
          <>
            {/* Active Accounts Section */}
            <DesktopActiveAccountsSection accounts={activeAccounts} />

            {/* History Section */}
            <DesktopHistorySection accounts={historyAccounts} />

            {activeAccounts.length === 0 && (
              <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '24px', marginTop: '24px' }}>
                <h3 style={{ margin: 0, color: '#333' }}>No active account</h3>
                <p style={{ marginTop: '10px', color: '#666' }}>
                  You currently have no active challenge account. Your history is still available above.
                </p>
                <button
                  onClick={() => navigate('/trading-accounts')}
                  style={{
                    marginTop: '16px',
                    backgroundColor: '#0b9fb8',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    boxShadow: '0 2px 4px rgba(11,159,184,0.3)'
                  }}
                >
                  Start New Challenge
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <DesktopFooter />

    </div>
  )
}

export default HomePage
