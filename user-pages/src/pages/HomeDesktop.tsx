import React from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopActiveAccountsSection from '../components/DesktopActiveAccountsSection'
import DesktopHistorySection from '../components/DesktopHistorySection'
import DesktopFooter from '../components/DesktopFooter'

const HomeDesktop: React.FC = () => {
  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      minHeight: '100vh'
    }}>
      <DesktopHeader />
      <DesktopSidebar />
      <div style={{
        marginLeft: '280px', // Account for sidebar
        padding: '24px',
        paddingTop: '80px', // Add top padding to avoid header overlap
        minHeight: '100vh'
      }}>
        {/* Page Header */}
        <div style={{
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
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
          <button
            onClick={() => window.location.href = '/trading-accounts'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#FFD700',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#333',
              fontWeight: '600',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(255,215,0,0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFC107';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(255,215,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFD700';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(255,215,0,0.3)';
            }}
          >
            <i className="fas fa-plus" style={{fontSize: '14px'}}></i>
            Start a Challenge
          </button>
        </div>

        {/* Active Accounts Section */}
        <DesktopActiveAccountsSection />

        {/* History Section */}
        <DesktopHistorySection />
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default HomeDesktop
