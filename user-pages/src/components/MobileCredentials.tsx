import React, { useState } from 'react'
import '../styles/MobileCredentials.css'

interface MobileCredentialsProps {
  server: string
  accountNumber: string
  password: string
}

const MobileCredentials: React.FC<MobileCredentialsProps> = ({
  server,
  accountNumber,
  password,
}) => {
  const [showPassword, setShowPassword] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="section">
      <div className="credentials-title">
        <span className="text-small" style={{color: 'rgba(255,255,255,0.7)'}}>Login credentials</span>
        <span style={{marginLeft: 'auto', background: '#28a745', padding: '4px 10px', borderRadius: '40px', fontSize: '12px', color: '#000'}}>
          <i className="fas fa-shield"></i> encrypted
        </span>
      </div>

      <div className="credential-list">
        <div className="credential-row">
          <div className="cred-left">
            <div className="cred-icon">
              <i className="fas fa-server"></i>
            </div>
            <div className="cred-info">
              <span className="cred-label">Server</span>
              <span className="cred-value">{server}</span>
            </div>
          </div>
          <div className="cred-badge" onClick={() => copyToClipboard(server)} style={{cursor: 'pointer'}}>
            <i className="fas fa-copy"></i> copy
          </div>
        </div>
        <div className="credential-row">
          <div className="cred-left">
            <div className="cred-icon">
              <i className="fas fa-hashtag"></i>
            </div>
            <div className="cred-info">
              <span className="cred-label">Account No.</span>
              <span className="cred-value">{accountNumber}</span>
            </div>
          </div>
          <div className="cred-badge" onClick={() => copyToClipboard(accountNumber)} style={{cursor: 'pointer'}}>
            <i className="fas fa-copy"></i> copy
          </div>
        </div>
        <div className="credential-row">
          <div className="cred-left">
            <div className="cred-icon">
              <i className="fas fa-key"></i>
            </div>
            <div className="cred-info">
              <span className="cred-label">Password</span>
              <span className="cred-value">{showPassword ? password : '•'.repeat(password.length)}</span>
            </div>
          </div>
          <div className="cred-badge" onClick={() => setShowPassword(!showPassword)} style={{cursor: 'pointer'}}>
            <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i> {showPassword ? 'hide' : 'show'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileCredentials
