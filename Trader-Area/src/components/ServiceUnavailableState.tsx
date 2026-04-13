import React from 'react'

type ServiceUnavailableStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
}

const brandPrimary = '#008ea4'
const brandGold = '#FFD700'

const ServiceUnavailableState: React.FC<ServiceUnavailableStateProps> = ({
  title = 'We’re experiencing a temporary issue on our side.',
  message = 'This section is temporarily unavailable because our service is not responding as expected. Please try again shortly — our team is already working to restore everything as quickly as possible.',
  onRetry,
}) => {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #ffffff, #f8fbfc)',
      borderRadius: '22px',
      padding: '28px',
      border: '1px solid #dce8ed',
      boxShadow: '0 16px 35px rgba(15,23,42,0.05)',
      maxWidth: '760px',
    }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '999px', background: 'rgba(0,142,164,0.08)', color: brandPrimary, fontSize: '12px', fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '16px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: brandGold }} />
        Temporary service interruption
      </div>
      <h2 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '28px', lineHeight: 1.2 }}>
        {title}
      </h2>
      <p style={{ margin: 0, color: '#475569', fontSize: '16px', lineHeight: 1.7, maxWidth: '620px' }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px' }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              background: brandPrimary,
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 10px 24px rgba(0,142,164,0.22)',
            }}
          >
            Try again
          </button>
        )}
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,215,0,0.12)', color: '#6b5a00', fontSize: '13px', fontWeight: 600 }}>
          MacheFunded status: monitoring recovery
        </div>
      </div>
    </div>
  )
}

export default ServiceUnavailableState