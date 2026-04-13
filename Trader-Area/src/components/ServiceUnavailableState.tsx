import React from 'react'

type ServiceUnavailableStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
}

const ServiceUnavailableState: React.FC<ServiceUnavailableStateProps> = ({
  title = 'Service Temporarily Unavailable',
  message = 'We are currently experiencing technical difficulties. Please try again in a few minutes.',
  onRetry,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      width: '100%',
      minHeight: '360px',
      padding: '40px 24px',
      borderRadius: '24px',
      background: '#ffffff',
      border: '1px solid rgba(226, 232, 240, 0.9)',
      boxShadow: '0 18px 40px rgba(15,23,42,0.05)',
      maxWidth: '760px',
      margin: '0 auto',
    }}>
      <h2 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '32px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
        {title}
      </h2>

      <p style={{ margin: 0, color: '#64748b', fontSize: '16px', lineHeight: 1.75, maxWidth: '560px' }}>
        {message}
      </p>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginTop: '14px',
        padding: '10px 14px',
        borderRadius: '12px',
        background: 'rgba(248, 250, 252, 1)',
        border: '1px solid rgba(226, 232, 240, 0.95)',
        color: '#475569',
        fontSize: '13px',
        fontWeight: 600,
      }}>
        MacheFunded status: monitoring recovery
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '22px', justifyContent: 'center' }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              background: 'linear-gradient(180deg, #0a9bb2, #008ea4)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 12px 24px rgba(0,142,164,0.22)',
            }}
          >
            Retry Now
          </button>
        )}
      </div>
    </div>
  )
}

export default ServiceUnavailableState