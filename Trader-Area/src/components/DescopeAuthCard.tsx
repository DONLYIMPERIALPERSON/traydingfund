import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { loginWithBackend, persistAuthUser } from '../mocks/auth'
import './DescopeAuthCard.css'

type DescopeAuthCardProps = {
  title: string
  subtitle: string
}

const DescopeAuthCard: React.FC<DescopeAuthCardProps> = ({ title, subtitle }) => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleMockLogin = async () => {
    setLoading(true)
    setMessage('')
    const user = await loginWithBackend()
    persistAuthUser(user)
    setMessage('Mock login successful. You can now browse the app.')
    setLoading(false)
    navigate('/')
  }

  return (
    <div>
      <h2 className="form-title">{title}</h2>
      <p className="naira-auth-subtitle">{subtitle}</p>

      <div className="naira-auth-stack">
        <label className="form-label naira-auth-label">Email</label>
        <div className="input-group">
          <i className="fas fa-envelope input-icon" />
          <input
            className="form-input"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <label className="form-label naira-auth-label">Password</label>
        <div className="input-group">
          <i className="fas fa-lock input-icon" />
          <input
            className="form-input"
            type="password"
            placeholder="Enter any password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          className="submit-button"
          type="button"
          disabled={loading}
          onClick={handleMockLogin}
        >
          {loading ? 'Signing in...' : 'Continue'}
        </button>
      </div>

      {message && <p className="naira-auth-helper">{message}</p>}
    </div>
  )
}

export default DescopeAuthCard