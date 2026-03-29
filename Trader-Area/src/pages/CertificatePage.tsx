import React, { useState, useEffect } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import { fetchCertificates } from '../lib/traderAuth'
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

const CertificatePage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchCertificatesData()
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

        {/* Certificates Grid */}
        {certificates.length > 0 ? (
          <div className="certificates-grid">
            {certificates.map((cert: Certificate) => (
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
                          <div class="certificate-fallback-type">${cert.certificate_type === 'passed_challenge'
                            ? 'Passed Challenge'
                            : cert.certificate_type === 'onboarding'
                              ? 'Challenge Onboarding'
                              : 'Payout'}</div>
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
              Complete challenges and payouts to earn certificates.
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <DesktopFooter />
    </div>
  )
}

export default CertificatePage
