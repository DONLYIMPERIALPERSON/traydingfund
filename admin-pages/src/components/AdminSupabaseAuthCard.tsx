import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type AdminSupabaseAuthCardProps = {
  onAuthenticated: () => Promise<void> | void
  onError: (message: string) => void
}

type AuthStep = 'email' | 'password' | 'otp' | 'createPassword'

const AdminSupabaseAuthCard = ({ onAuthenticated, onError }: AdminSupabaseAuthCardProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<AuthStep>('email')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleEmailSubmit = useCallback(async () => {
    if (!email.trim()) {
      setLocalError('Please enter your email address')
      return
    }

    setLocalError('')
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
        setStep('password')
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
        if (error) throw error
        setStep('otp')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to continue'
      setLocalError(message)
      onError(message)
    } finally {
      setLoading(false)
    }
  }, [email, onError])

  const handlePasswordSubmit = useCallback(async () => {
    if (!password.trim()) {
      setLocalError('Please enter your password')
      return
    }

    setLocalError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })
      if (error) {
        const message = error.message.toLowerCase()
        if (message.includes('invalid login credentials') || message.includes('invalid login')) {
          const { error: otpError } = await supabase.auth.signInWithOtp({ email: email.trim() })
          if (otpError) throw otpError
          setStep('otp')
          return
        }
        throw error
      }

      if (data?.session?.access_token) {
        localStorage.setItem('supabase_access_token', data.session.access_token)
        await onAuthenticated()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in'
      setLocalError(message)
      onError(message)
    } finally {
      setLoading(false)
    }
  }, [email, password, onAuthenticated, onError])

  const handleOtpSubmit = useCallback(async () => {
    if (!otpCode.trim()) {
      setLocalError('Please enter the OTP code')
      return
    }

    setLocalError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      })
      if (error) throw error

      if (data?.session?.access_token) {
        localStorage.setItem('supabase_access_token', data.session.access_token)
      }
      setStep('createPassword')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to verify OTP'
      setLocalError(message)
      onError(message)
    } finally {
      setLoading(false)
    }
  }, [email, otpCode, onError])

  const handleCreatePassword = useCallback(async () => {
    if (!password.trim()) {
      setLocalError('Please enter a password')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    setLocalError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.updateUser({ password: password.trim() })
      if (error) throw error

      if (data?.user) {
        const session = await supabase.auth.getSession()
        if (session.data.session?.access_token) {
          localStorage.setItem('supabase_access_token', session.data.session.access_token)
          await onAuthenticated()
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to set password'
      setLocalError(message)
      onError(message)
    } finally {
      setLoading(false)
    }
  }, [password, confirmPassword, onAuthenticated, onError])

  return (
    <div className="admin-auth-stack">
      {step === 'email' && (
        <>
          <label className="admin-auth-label">Admin Email</label>
          <input
            className="admin-auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter admin email"
          />
          <button
            className="admin-auth-primary-btn"
            type="button"
            disabled={loading}
            onClick={handleEmailSubmit}
          >
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </>
      )}

      {step === 'password' && (
        <>
          <label className="admin-auth-label">Password</label>
          <input
            className="admin-auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
          <button
            className="admin-auth-primary-btn"
            type="button"
            disabled={loading}
            onClick={handlePasswordSubmit}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </>
      )}

      {step === 'otp' && (
        <>
          <label className="admin-auth-label">OTP Code</label>
          <input
            className="admin-auth-input"
            type="text"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="Enter OTP"
          />
          <button
            className="admin-auth-primary-btn"
            type="button"
            disabled={loading}
            onClick={handleOtpSubmit}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </>
      )}

      {step === 'createPassword' && (
        <>
          <label className="admin-auth-label">Create Password</label>
          <input
            className="admin-auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create password"
          />
          <label className="admin-auth-label">Confirm Password</label>
          <input
            className="admin-auth-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
          />
          <button
            className="admin-auth-primary-btn"
            type="button"
            disabled={loading}
            onClick={handleCreatePassword}
          >
            {loading ? 'Saving...' : 'Set Password'}
          </button>
        </>
      )}

      {localError && <p className="admin-auth-error">{localError}</p>}
    </div>
  )
}

export default AdminSupabaseAuthCard