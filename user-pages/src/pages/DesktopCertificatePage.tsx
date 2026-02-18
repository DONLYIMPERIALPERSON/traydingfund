import React, { useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import '../styles/DesktopCertificatePage.css'

const DesktopCertificatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payout' | 'funded'>('funded')

  const handleShare = (certificateId: string) => {
    // Handle share functionality
    console.log('Share certificate:', certificateId)
    if (navigator.share) {
      navigator.share({
        title: 'Trading Certificate',
        text: 'Check out my trading achievement!',
        url: window.location.href
      })
    }
  }

  const handleDownload = (certificateId: string) => {
    // Handle download functionality
    console.log('Download certificate:', certificateId)
    // This would typically trigger a download
  }

  const payoutCertificates = [
    { id: 'payout-1', title: 'First Payout Achievement', date: '15 Jan 2026', value: '₦50,000' },
    { id: 'payout-2', title: 'Consistent Trader', date: '10 Dec 2025', value: '₦25,000' },
    { id: 'payout-3', title: 'Profit Milestone', date: '5 Nov 2025', value: '₦100,000' }
  ]

  const fundedCertificates = [
    { id: 'funded-1', title: 'Challenge Completed', date: '20 Jan 2026', value: 'Standard Account' },
    { id: 'funded-2', title: 'Funded Trader', date: '15 Dec 2025', value: 'Premium Account' },
    { id: 'funded-3', title: 'Elite Status', date: '1 Nov 2025', value: 'VIP Account' }
  ]

  const currentCertificates = activeTab === 'payout' ? payoutCertificates : fundedCertificates

  return (
    <div className="certificate-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div style={{
        marginLeft: '280px', // Account for sidebar
        padding: '24px',
        paddingTop: '80px', // Add top padding to avoid header overlap
        minHeight: '100vh'
      }}>
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '8px 0',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#333'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
        >
          <i className="fas fa-arrow-left"></i>
          Back to Accounts Overview
        </button>

        {/* Page Header */}
        <div className="page-header">
          <h1>Trading Certificates</h1>
          <p>View and download your trading achievements and certificates</p>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab-button ${activeTab === 'funded' ? 'active' : ''}`}
              onClick={() => setActiveTab('funded')}
            >
              Funded Certificates
            </button>
            <button
              className={`tab-button ${activeTab === 'payout' ? 'active' : ''}`}
              onClick={() => setActiveTab('payout')}
            >
              Payout Certificates
            </button>
          </div>
        </div>

        {/* Certificates Grid */}
        {currentCertificates.length > 0 ? (
          <div className="certificates-grid">
            {currentCertificates.map((cert) => (
              <div key={cert.id} className="certificate-card">
                {/* Certificate Placeholder */}
                <div className="certificate-placeholder">
                  <i className="fas fa-certificate certificate-icon"></i>
                  <div className="certificate-title">{cert.title}</div>
                  <div className="certificate-date">{cert.date}</div>
                  <div className="certificate-value">{cert.value}</div>
                </div>

                {/* Action Buttons */}
                <div className="certificate-actions">
                  <button
                    className="action-button share-button"
                    onClick={() => handleShare(cert.id)}
                  >
                    <i className="fas fa-share"></i>
                    Share
                  </button>
                  <button
                    className="action-button download-button"
                    onClick={() => handleDownload(cert.id)}
                  >
                    <i className="fas fa-download"></i>
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="empty-state">
            <i className="fas fa-certificate empty-icon"></i>
            <div className="empty-title">No Certificates Yet</div>
            <div className="empty-description">
              {activeTab === 'payout'
                ? 'Complete payouts to earn certificates'
                : 'Complete challenges to get funded certificates'
              }
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default DesktopCertificatePage
