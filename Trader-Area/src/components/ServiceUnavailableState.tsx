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
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #ffffff 0%, #f7fbfc 55%, #f2f8fa 100%)',
      borderRadius: '24px',
      padding: '32px',
      border: '1px solid rgba(191, 219, 254, 0.55)',
      boxShadow: '0 18px 45px rgba(15,23,42,0.06)',
      maxWidth: '760px',
    }}>
      <style>{`
        @keyframes servicePulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.08); opacity: 1; }
        }

        @keyframes serviceFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(0,142,164,0.1), transparent 28%)' }} />
      <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '140px', height: '140px', borderRadius: '999px', background: 'radial-gradient(circle, rgba(255,215,0,0.2), rgba(255,215,0,0))', filter: 'blur(2px)' }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap' }}>
        <div style={{
          width: '62px',
          height: '62px',
          borderRadius: '18px',
          background: 'linear-gradient(180deg, rgba(0,142,164,0.12), rgba(0,142,164,0.05))',
          border: '1px solid rgba(0,142,164,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'serviceFloat 4s ease-in-out infinite',
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '999px',
            background: brandGold,
            boxShadow: '0 0 0 10px rgba(255,215,0,0.12)',
            animation: 'servicePulse 2.2s ease-in-out infinite',
          }} />
        </div>

        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '999px', background: 'rgba(0,142,164,0.08)', color: brandPrimary, fontSize: '12px', fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '14px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: brandGold }} />
            Temporary service interruption
          </div>

          <h2 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '28px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          <p style={{ margin: 0, color: '#475569', fontSize: '16px', lineHeight: 1.75, maxWidth: '620px' }}>
            {message}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginTop: '18px', maxWidth: '520px' }}>
            <div style={{ padding: '12px 14px', borderRadius: '14px', background: '#ffffff', border: '1px solid rgba(226,232,240,0.9)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.45px', marginBottom: '6px' }}>Status</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Investigating</div>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: '14px', background: '#ffffff', border: '1px solid rgba(226,232,240,0.9)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.45px', marginBottom: '6px' }}>Impact</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Data temporarily unavailable</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '24px' }}>
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
            Try again
          </button>
        )}
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(226,232,240,0.95)', color: '#475569', fontSize: '13px', fontWeight: 600 }}>
          MacheFunded status: monitoring recovery
        </div>
      </div>
    </div>
  )
}

export default ServiceUnavailableState