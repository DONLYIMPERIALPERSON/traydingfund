import React from 'react'

type AppLoadingScreenProps = {
  visible: boolean
}

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ visible }) => {
  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 6000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background:
        'radial-gradient(900px 500px at 8% 6%, rgba(127, 231, 247, 0.16), transparent 60%), radial-gradient(700px 420px at 92% 12%, rgba(11, 142, 166, 0.14), transparent 60%), linear-gradient(180deg, #06171d 0%, #0a2730 100%)',
    }}>
      <div style={{
        width: 'min(88vw, 360px)',
        borderRadius: '28px',
        padding: '28px 24px',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.24)',
        color: '#eef7fb',
      }}>
        <img
          src="/login-page-logo.png"
          alt="MacheFunded"
          style={{ width: '88px', height: '88px', objectFit: 'contain', display: 'block', margin: '0 auto 18px' }}
        />
        <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Trader Area</div>
        <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(238,247,251,0.76)', marginBottom: '18px' }}>
          Preparing your workspace and loading your trading dashboard.
        </div>
        <div style={{
          height: '6px',
          width: '100%',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: '40%',
            borderRadius: '999px',
            background: 'linear-gradient(90deg, #7fe7f7 0%, #ffd700 100%)',
            animation: 'traderAreaLoadingBar 1.2s ease-in-out infinite',
          }} />
        </div>
      </div>
      <style>{`
        @keyframes traderAreaLoadingBar {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(280%); }
        }
      `}</style>
    </div>
  )
}

export default AppLoadingScreen