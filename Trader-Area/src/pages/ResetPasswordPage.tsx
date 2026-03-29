import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { loginWithBackend } from '../lib/traderAuth'
import '../styles/DesktopLoginPage.css'
import '../components/FirebaseAuthCard.css'

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleResetPassword = useCallback(async () => {
    if (!password.trim()) {
      setError('Please enter a new password')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError('')
    setInfo('')
    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
      })
      if (updateError) {
        throw updateError
      }
      const session = await supabase.auth.getSession()
      if (session.data.session?.access_token) {
        localStorage.setItem('supabase_access_token', session.data.session.access_token)
        await loginWithBackend()
        setInfo('Password updated successfully. Signing you in...')
        setTimeout(() => navigate('/'), 800)
      } else {
        setInfo('Password updated successfully. Redirecting to login...')
        setTimeout(() => navigate('/login'), 1200)
      }
    } catch (err) {
      console.error('Password reset failed', err)
      setError('Unable to reset password. Please request a new link and try again.')
    } finally {
      setLoading(false)
    }
  }, [password, confirmPassword, navigate])

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="hero-section">
          <span className="hero-watermark">MACHEFUNDED</span>
          <div className="hero-icon">
            <img src="/login-page-logo.png" alt="MacheFunded" className="hero-logo" />
          </div>
          <h1 className="hero-title">Reset Password</h1>
          <p className="hero-subtitle">Choose a new password to continue.</p>
        </div>

        <div className="auth-form">
          <div className="form-content">
            <div className="naira-auth-stack">
              <label className="form-label naira-auth-label">New Password</label>
              <div className="input-group">
                <i className="fas fa-lock input-icon" />
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="naira-auth-visibility"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>

              <label className="form-label naira-auth-label">Confirm Password</label>
              <div className="input-group">
                <i className="fas fa-lock input-icon" />
                <input
                  className="form-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="naira-auth-visibility"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={loading}
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>

              <button
                className="submit-button"
                type="button"
                disabled={loading}
                onClick={handleResetPassword}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>

              {info && <p className="naira-auth-info">{info}</p>}
              {error && <p className="naira-auth-error">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage