import React from 'react'
import DesktopHeader from '../components/DesktopHeader'

const DesktopAccountDetailsPage: React.FC = () => {
  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      minHeight: '100vh'
    }}>
      <DesktopHeader />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        paddingTop: '80px' // Account for fixed header
      }}>
        <div style={{
          textAlign: 'center',
          padding: '60px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          maxWidth: '600px',
          width: '100%'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 30px',
            boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)'
          }}>
            <i className="fas fa-chart-line" style={{fontSize: '48px', color: '#000'}}></i>
          </div>

          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: '#FFD700',
            marginBottom: '16px',
            textShadow: '0 2px 4px rgba(255, 215, 0, 0.3)'
          }}>
            Account Details
          </h1>

          <h2 style={{
            fontSize: '28px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '24px'
          }}>
            Coming Soon
          </h2>

          <p style={{
            fontSize: '18px',
            color: '#666',
            lineHeight: '1.6',
            marginBottom: '40px'
          }}>
            Desktop version of Account Details is currently under development.
            Please use the mobile version for now.
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255,215,0,0.1)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '25px',
            padding: '12px 24px'
          }}>
            <i className="fas fa-tools" style={{color: '#FFD700', fontSize: '20px'}}></i>
            <span style={{fontSize: '16px', fontWeight: '600', color: '#333'}}>
              In Development
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesktopAccountDetailsPage