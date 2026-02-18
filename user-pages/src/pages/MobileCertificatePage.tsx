import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/MobileCertificatePage.css'

const MobileCertificatePage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'payout' | 'funded'>('funded')

  const handleBack = () => {
    navigate(-1)
  }

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
    <div className="mobile-certificate-page">
      <div className="mobile-certificate-fixed-header">
        <div className="mobile-certificate-header-shell">
          <div className="mobile-certificate-header-row">
            <div className="mobile-certificate-header-left">
              <div className="mobile-certificate-back-button" onClick={handleBack}>
                <i className="fas fa-chevron-left"></i>
              </div>
            </div>
            <div className="mobile-certificate-header-center">
              <span className="mobile-certificate-header-title">Certificates</span>
            </div>
            <div className="mobile-certificate-header-right" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="mobile-certificate-content-container">
        <div className="mobile-certificate-content-padding">

          {/* Tabs */}
          <div className="mobile-certificate-card" style={{marginBottom: '20px'}}>
            <div className="mobile-certificate-card-inner">
              <div style={{display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px'}}>
                <button
                  onClick={() => setActiveTab('funded')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: activeTab === 'funded' ? '#FFD700' : 'transparent',
                    color: activeTab === 'funded' ? '#000' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  Funded
                </button>
                <button
                  onClick={() => setActiveTab('payout')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: activeTab === 'payout' ? '#FFD700' : 'transparent',
                    color: activeTab === 'payout' ? '#000' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  Payout
                </button>
              </div>
            </div>
          </div>

          {/* Certificates List */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {currentCertificates.map((cert) => (
              <div key={cert.id} className="mobile-certificate-card">
                <div className="mobile-certificate-card-inner">
                  {/* Certificate Placeholder */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,215,0,0.05) 100%)',
                    border: '2px dashed rgba(255,215,0,0.3)',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    marginBottom: '16px'
                  }}>
                    <i className="fas fa-certificate" style={{
                      fontSize: '48px',
                      color: '#FFD700',
                      marginBottom: '12px',
                      opacity: 0.7
                    }}></i>
                    <div style={{fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '4px'}}>
                      {cert.title}
                    </div>
                    <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px'}}>
                      {cert.date}
                    </div>
                    <div style={{fontSize: '16px', fontWeight: '600', color: '#FFD700'}}>
                      {cert.value}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{display: 'flex', gap: '12px'}}>
                    <button
                      onClick={() => handleShare(cert.id)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'rgba(29, 161, 242, 0.1)',
                        border: '1px solid rgba(29, 161, 242, 0.3)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        color: '#1DA1F2',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-share"></i>
                      Share
                    </button>
                    <button
                      onClick={() => handleDownload(cert.id)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'rgba(255,215,0,0.8)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        color: 'black',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-download"></i>
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {currentCertificates.length === 0 && (
            <div className="mobile-certificate-card" style={{textAlign: 'center', padding: '40px 20px'}}>
              <i className="fas fa-certificate" style={{
                fontSize: '48px',
                color: 'rgba(255,215,0,0.3)',
                marginBottom: '16px'
              }}></i>
              <div style={{fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '8px'}}>
                No Certificates Yet
              </div>
              <div style={{fontSize: '14px', color: 'rgba(255,255,255,0.6)'}}>
                {activeTab === 'payout'
                  ? 'Complete payouts to earn certificates'
                  : 'Complete challenges to get funded certificates'
                }
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default MobileCertificatePage