import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCertificates, type CertificateResponse } from '../lib/traderAuth'
import '../styles/MobileCertificatesPage.css'

type CertificateTab = 'onboarding' | 'passed_challenge' | 'reward'

const tabLabels: Record<CertificateTab, string> = {
  onboarding: 'Onboarding',
  passed_challenge: 'Passed Challenge',
  reward: 'Reward',
}

const normalizeCertificateTab = (certificate: CertificateResponse): CertificateTab => {
  const type = certificate.certificate_type.toLowerCase()
  if (type === 'onboarding') return 'onboarding'
  if (type === 'passed_challenge') return 'passed_challenge'
  return 'reward'
}

const MobileCertificatesPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [certificates, setCertificates] = useState<CertificateResponse[]>([])
  const [activeTab, setActiveTab] = useState<CertificateTab>('onboarding')
  const [expandedGroup, setExpandedGroup] = useState<CertificateTab | null>(null)

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        const data = await fetchCertificates()
        setCertificates(data.certificates)
      } catch (error) {
        console.error('Error fetching certificates:', error)
      } finally {
        setLoading(false)
      }
    }
    void loadCertificates()
  }, [])

  const groupedCertificates = useMemo(() => {
    return certificates.reduce<Record<CertificateTab, CertificateResponse[]>>((acc, certificate) => {
      const key = normalizeCertificateTab(certificate)
      acc[key].push(certificate)
      return acc
    }, {
      onboarding: [],
      passed_challenge: [],
      reward: [],
    })
  }, [certificates])

  const activeCertificates = groupedCertificates[activeTab]
  const sortedActiveCertificates = useMemo(
    () => [...activeCertificates].sort(
      (a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
    ),
    [activeCertificates],
  )
  const featuredCertificate = sortedActiveCertificates[0] ?? null
  const remainingCertificates = featuredCertificate ? sortedActiveCertificates.slice(1) : []

  const handleDownload = (certificate: CertificateResponse) => {
    const link = document.createElement('a')
    link.href = certificate.certificate_url
    link.download = `${certificate.title.replace(/\s+/g, '_')}.png`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="mobile-certificates-page">
      <div className="mobile-certificates-shell">
        <header className="mobile-certificates-header">
          <button type="button" className="mobile-certificates-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-certificates-header__text">
            <h1>Certificates</h1>
            <p>View and download your achievements.</p>
          </div>
          <button type="button" className="mobile-certificates-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        <div className="mobile-certificates-tabs">
          {(Object.keys(tabLabels) as CertificateTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'is-active' : ''}
              onClick={() => {
                setActiveTab(tab)
                setExpandedGroup(null)
              }}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mobile-certificates-empty">Loading certificates...</div>
        ) : sortedActiveCertificates.length === 0 ? (
          <div className="mobile-certificates-empty">No certificates in this tab yet.</div>
        ) : (
          <section className="mobile-certificates-content">
            {featuredCertificate ? (
              <article className="mobile-certificate-card mobile-certificate-card--featured mobile-certificate-card--hero">
                <div className="mobile-certificate-card__preview">
                  <img src={featuredCertificate.certificate_url} alt={featuredCertificate.title} />
                </div>
                <div className="mobile-certificate-card__body">
                  <span className="mobile-certificate-card__featured-label">Most Recent</span>
                  <strong>{featuredCertificate.title}</strong>
                  <p>{new Date(featuredCertificate.generated_at).toLocaleDateString()}</p>
                  <button type="button" onClick={() => handleDownload(featuredCertificate)}>
                    <i className="fas fa-download" />
                    Download
                  </button>
                </div>
              </article>
            ) : null}

            <button
              type="button"
              className="mobile-certificates-group-badge"
              onClick={() => setExpandedGroup((current) => current === activeTab ? null : activeTab)}
            >
              <div>
                <span>{tabLabels[activeTab]}</span>
                <strong>x{sortedActiveCertificates.length}</strong>
              </div>
              <i className={`fas fa-chevron-${expandedGroup === activeTab ? 'up' : 'down'}`} />
            </button>

            {expandedGroup === activeTab ? (
              <div className="mobile-certificates-list">
                {remainingCertificates.length > 0 ? (
                  <div className="mobile-certificates-sublist">
                    {remainingCertificates.map((certificate) => (
                      <article key={certificate.id} className="mobile-certificate-card">
                        <div className="mobile-certificate-card__preview">
                          <img src={certificate.certificate_url} alt={certificate.title} />
                        </div>
                        <div className="mobile-certificate-card__body">
                          <strong>{certificate.title}</strong>
                          <p>{new Date(certificate.generated_at).toLocaleDateString()}</p>
                          <button type="button" onClick={() => handleDownload(certificate)}>
                            <i className="fas fa-download" />
                            Download
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        )}
      </div>
    </div>
  )
}

export default MobileCertificatesPage