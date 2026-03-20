import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabaseClient'
import { loginWithBackend, updateProfile } from '../mocks/firebaseAuth'
import './FirebaseAuthCard.css'

type FirebaseAuthCardProps = {
  title: string
  subtitle: string
}

type AuthStep = 'email' | 'password' | 'otp' | 'createPassword'

function toSafeAuthErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const message = err.message.toLowerCase()

    if (message.includes('failed to fetch') || message.includes('network')) {
      return 'Network error. Please check your connection and try again.'
    }

    if (
      message.includes('invalid') ||
      message.includes('wrong-password') ||
      message.includes('user-not-found')
    ) {
      return 'Unable to sign in with those details. Please try again.'
    }

    if (message.includes('too-many-requests')) {
      return 'Too many attempts. Please wait a moment and try again.'
    }

    if (message.includes('weak-password')) {
      return 'Password should be at least 6 characters long.'
    }
  }

  return 'Unable to sign in right now. Please try again shortly.'
}

const FirebaseAuthCard: React.FC<FirebaseAuthCardProps> = ({ title, subtitle }) => {
  const navigate = useNavigate()
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [step, setStep] = useState<AuthStep>('email')
  const [profilePromptVisible, setProfilePromptVisible] = useState(false)

  // Form state
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [otpCode, setOtpCode] = useState<string>('')
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')

  const shouldPromptForName = (user?: { full_name: string | null; first_name?: string | null; last_name?: string | null }) => {
    if (!user) return false
    const first = user.first_name?.trim() ?? ''
    const last = user.last_name?.trim() ?? ''
    const full = user.full_name?.trim() ?? ''
    return !first || !last || !full
  }

  const handleProfileCompletion = async () => {
    if (!firstName.trim()) {
      setError('Please enter your first name')
      return
    }
    if (!lastName.trim()) {
      setError('Please enter your last name')
      return
    }

    setError('')
    setLoading(true)

    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })
      setProfilePromptVisible(false)
      navigate('/')
    } catch (err) {
      console.error('Profile update failed', err)
      setError(toSafeAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSubmit = useCallback(async () => {
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setError('')
    setLoading(true)

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL as string
      const response = await fetch(`${baseUrl}/auth/email-exists?email=${encodeURIComponent(email.trim())}`)
      if (!response.ok) {
        throw new Error('Unable to verify email')
      }
      const data = await response.json()
      const isRegistered = Boolean(data?.exists)

      if (isRegistered) {
        // Existing user - go to password step
        setStep('password')
      } else {
        // New user - send OTP
        const { error: otpError } = await supabase.auth.signInWithOtp({ email: email.trim() })
        if (otpError) {
          throw otpError
        }
        setStep('otp')
      }
    } catch (err) {
      console.error('Email check failed', err)
      setError(toSafeAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [email])

  const handleEmailKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEmailSubmit()
    }
  }, [handleEmailSubmit])

  const handlePasswordSubmit = useCallback(async () => {
    if (!password.trim()) {
      setError('Please enter your password')
      return
    }

    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })
      if (signInError) {
        throw signInError
      }

      if (data?.session?.access_token) {
        localStorage.setItem('supabase_access_token', data.session.access_token)
        const user = await loginWithBackend()
        if (shouldPromptForName(user)) {
          setProfilePromptVisible(true)
          return
        }
      }
      navigate('/')
    } catch (err) {
      console.error('Sign in failed', err)
      setError(toSafeAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [email, password, navigate])

  const handlePasswordKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePasswordSubmit()
    }
  }, [handlePasswordSubmit])

  const handleOtpSubmit = useCallback(async () => {
    if (!otpCode.trim()) {
      setError('Please enter the OTP code')
      return
    }

    setError('')
    setLoading(true)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      })
      if (verifyError) {
        throw verifyError
      }
      if (data?.session?.access_token) {
        localStorage.setItem('supabase_access_token', data.session.access_token)
        const user = await loginWithBackend()
        if (shouldPromptForName(user)) {
          setProfilePromptVisible(true)
          return
        }
      }
      setStep('createPassword')
    } catch (err) {
      console.error('OTP verification failed', err)
      setError(toSafeAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [email, otpCode])

  const handleOtpKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleOtpSubmit()
    }
  }, [handleOtpSubmit])

  const handleCreateAccount = useCallback(async () => {
    if (!password.trim()) {
      setError('Please enter a password')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setError('')
    setLoading(true)

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
      })
      if (updateError) {
        throw updateError
      }
      if (data?.user) {
        // ensure session stored
        const session = await supabase.auth.getSession()
        if (session.data.session?.access_token) {
          localStorage.setItem('supabase_access_token', session.data.session.access_token)
          const user = await loginWithBackend()
          if (shouldPromptForName(user)) {
            setProfilePromptVisible(true)
            return
          }
        }
      }
      navigate('/')
    } catch (err) {
      console.error('Account creation failed', err)
      setError(toSafeAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [email, password, confirmPassword, navigate])

  const handleCreateAccountKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateAccount()
    }
  }, [handleCreateAccount])

  const handleBackToEmail = useCallback(() => {
    setStep('email')
    setError('')
    setPassword('')
    setOtpCode('')
    setConfirmPassword('')
  }, [])

  const renderEmailStep = () => (
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
          onKeyDown={handleEmailKeyDown}
          disabled={loading}
        />
      </div>

      <button
        className="submit-button"
        type="button"
        disabled={loading || !email.trim()}
        onClick={handleEmailSubmit}
      >
        {loading ? 'Checking...' : 'Continue'}
      </button>

      <p className="naira-auth-continue-note">Continue securely with your MacheFunded account.</p>
    </div>
  )

  const renderPasswordStep = () => (
    <div className="naira-auth-stack">
      <div className="naira-auth-email-display">
        <span>{email}</span>
        <button
          type="button"
          className="naira-auth-change-email"
          onClick={handleBackToEmail}
          disabled={loading}
        >
          Change
        </button>
      </div>

      <label className="form-label naira-auth-label">Password</label>
      <div className="input-group">
        <i className="fas fa-lock input-icon" />
        <input
          className="form-input"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handlePasswordKeyDown}
          disabled={loading}
        />
      </div>

      <button
        className="submit-button"
        type="button"
        disabled={loading || !password.trim()}
        onClick={handlePasswordSubmit}
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      <p className="naira-auth-continue-note">Continue securely with your MacheFunded account.</p>
    </div>
  )

  const renderOtpStep = () => (
    <div className="naira-auth-stack">
      <div className="naira-auth-email-display">
        <span>{email}</span>
        <button
          type="button"
          className="naira-auth-change-email"
          onClick={handleBackToEmail}
          disabled={loading}
        >
          Change
        </button>
      </div>

      <p className="naira-auth-helper">
        Check your email for a verification code to create your account.
      </p>
      <div className="input-group">
        <i className="fas fa-key input-icon" />
        <input
          className="form-input"
          type="text"
          placeholder="Enter OTP"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value)}
          onKeyDown={handleOtpKeyDown}
          disabled={loading}
        />
      </div>

      <button
        className="submit-button"
        type="button"
        disabled={loading || !otpCode.trim()}
        onClick={handleOtpSubmit}
      >
        {loading ? 'Please wait...' : 'Verify Code'}
      </button>

      <button
        className="submit-button naira-auth-secondary-btn"
        type="button"
        disabled={loading}
        onClick={handleEmailSubmit}
      >
        {loading ? 'Please wait...' : 'Send again'}
      </button>
    </div>
  )

  const renderCreatePasswordStep = () => (
    <div className="naira-auth-stack">
      <div className="naira-auth-email-display">
        <span>{email}</span>
        <button
          type="button"
          className="naira-auth-change-email"
          onClick={handleBackToEmail}
          disabled={loading}
        >
          Change
        </button>
      </div>

      <label className="form-label naira-auth-label">Create Password</label>
      <div className="input-group">
        <i className="fas fa-lock input-icon" />
        <input
          className="form-input"
          type="password"
          placeholder="Create password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleCreateAccountKeyDown}
          disabled={loading}
        />
      </div>

      <label className="form-label naira-auth-label">Confirm Password</label>
      <div className="input-group">
        <i className="fas fa-lock input-icon" />
        <input
          className="form-input"
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={handleCreateAccountKeyDown}
          disabled={loading}
        />
      </div>

      <button
        className="submit-button"
        type="button"
        disabled={loading || !password.trim() || !confirmPassword.trim()}
        onClick={handleCreateAccount}
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </div>
  )

  const renderCurrentStep = () => {
    if (profilePromptVisible) {
      return (
        <div className="naira-auth-stack">
          <p className="naira-auth-helper">
            Please tell us your first and last name to complete your profile.
          </p>
          <label className="form-label naira-auth-label">First Name</label>
          <div className="input-group">
            <i className="fas fa-user input-icon" />
            <input
              className="form-input"
              type="text"
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
            />
          </div>

          <label className="form-label naira-auth-label">Last Name</label>
          <div className="input-group">
            <i className="fas fa-user input-icon" />
            <input
              className="form-input"
              type="text"
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            className="submit-button"
            type="button"
            disabled={loading || !firstName.trim() || !lastName.trim()}
            onClick={handleProfileCompletion}
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      )
    }

    switch (step) {
      case 'email':
        return renderEmailStep()
      case 'password':
        return renderPasswordStep()
      case 'otp':
        return renderOtpStep()
      case 'createPassword':
        return renderCreatePasswordStep()
      default:
        return renderEmailStep()
    }
  }

  return (
    <div>
      <h2 className="form-title">{title}</h2>
      <p className="naira-auth-subtitle">{subtitle}</p>

      {renderCurrentStep()}

      {loading && <p className="naira-auth-helper">Please wait...</p>}
      {error && <p className="naira-auth-error">{error}</p>}
    </div>
  )
}

export default FirebaseAuthCard