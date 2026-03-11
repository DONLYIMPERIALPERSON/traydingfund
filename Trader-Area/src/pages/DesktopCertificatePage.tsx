import React, { useState, useEffect } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import { fetchCertificates, fetchProfile } from '../lib/auth'
import '../styles/DesktopCertificatePage.css'

interface Certificate {
  id: number
  certificate_type: string
  title: string
  description: string | null
  certificate_url: string
  generated_at: string
  related_entity_id: string | null
  certificate_metadata: string | null
}

const DesktopCertificatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payout' | 'funded'>('funded')
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [kycStatus, setKycStatus] = useState<string>('not_started')

  useEffect(() => {
    fetchCertificatesData()
    fetchKycStatus()
  }, [])

  const fetchCertificatesData = async () => {
    try {
      const data = await fetchCertificates()
      setCertificates(data.certificates)
    } catch (error) {
      console.error('Error fetching certificates:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchKycStatus = async () => {
    try {
      const profile = await fetchProfile()
      setKycStatus(profile.kyc_status || 'not_started')
    } catch (error) {
      console.error('Error fetching KYC status:', error)
    }
  }

  const handleShare = (certificate: Certificate) => {
    if (navigator.share) {
      navigator.share({
        title: certificate.title,
        text: certificate.description || 'Check out my trading achievement!',
        url: certificate.certificate_url
      })
    }
  }

  const handleDownload = (certificate: Certificate) => {
    // Create a temporary link to download the certificate
    const link = document.createElement('a')
    link.href = certificate.certificate_url
    link.download = `${certificate.title.replace(/\s+/g, '_')}.png`
    link.target = '_blank' // Open in new tab if download doesn't work
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredCertificates = certificates.filter(cert =>
    activeTab === 'payout' ? cert.certificate_type === 'payout' : cert.certificate_type === 'funding'
  )

  // Check if user is eligible (has completed KYC)
  const KYC_COMPLETED_STATUSES = new Set(['verified', 'approved', 'completed'])
  const isEligible = KYC_COMPLETED_STATUSES.has((kycStatus || '').toLowerCase())

  if (loading) {
    return (
      <div className="certificate-page">
        <DesktopHeader />
        <DesktopSidebar />
        <div className="certificate-content certificate-content--center">
          <div>Loading certificates...</div>
        </div>
      </div>
    )
  }

  // If user is not eligible (KYC not completed), show only the KYC warning
  if (!isEligible) {
    return (
      <div className="certificate-page">
        <DesktopHeader />
        <DesktopSidebar />
        <div className="certificate-content certificate-content--center">
          {/* KYC Warning - Full Page */}
          <div className="kyc-warning">
            <i className="fas fa-exclamation-triangle"></i>
            <div>
              <div className="kyc-warning-title">KYC Required</div>
              <div className="kyc-warning-text">
                Complete your KYC verification to access and generate certificates for your trading achievements.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="certificate-page">
      <DesktopHeader />
      <DesktopSidebar />
      <div className="certificate-content">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="back-button"
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
        {filteredCertificates.length > 0 ? (
          <div className="certificates-grid">
            {filteredCertificates.map((cert: Certificate) => (
              <div key={cert.id} className="certificate-card">
                {/* Certificate Image */}
                <div className="certificate-preview">
                  <img
                    src={cert.certificate_url}
                    alt={cert.title}
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '250px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      marginBottom: '12px'
                    }}
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div')
                        fallback.className = 'certificate-fallback'
                        fallback.innerHTML = `
                          <i class="fas fa-certificate"></i>
                          <div class="certificate-fallback-title">${cert.title}</div>
                          <div class="certificate-fallback-date">${new Date(cert.generated_at).toLocaleDateString()}</div>
                          <div class="certificate-fallback-type">${cert.certificate_type === 'funding' ? 'Funded Account' : 'Payout'}</div>
                        `
                        parent.innerHTML = ''
                        parent.appendChild(fallback)
                      }
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div className="certificate-actions">
                  <button
                    className="action-button share-button"
                    onClick={() => handleShare(cert)}
                  >
                    <i className="fas fa-share"></i>
                    Share
                  </button>
                  <button
                    className="action-button download-button"
                    onClick={() => handleDownload(cert)}
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
