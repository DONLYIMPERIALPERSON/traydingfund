import React, { useCallback, useState } from 'react'
import { Descope } from '@descope/react-sdk'
import { useNavigate } from 'react-router-dom'

import { loginWithBackend, persistAuthUser } from '../lib/auth'
import './DescopeAuthCard.css'


type DescopeAuthCardProps = {
  title: string
  subtitle: string
}

const projectId = import.meta.env.VITE_DESCOPE_PROJECT_ID ?? ''

type FlowNextFn = (interactionId: string, form?: Record<string, unknown>) => void
type DescopeSuccessPayload = {
  detail?: {
    sessionJwt?: string
  }
}

const DescopeAuthCard: React.FC<DescopeAuthCardProps> = ({ title, subtitle }) => {
  const navigate = useNavigate()
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [interactionLoading, setInteractionLoading] = useState<boolean>(false)
  const [screenName, setScreenName] = useState<string>('')
  const [screenContext, setScreenContext] = useState<Record<string, unknown>>({})
  const [nextAction, setNextAction] = useState<FlowNextFn | null>(null)

  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [code, setCode] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')

  const handleSuccess = useCallback(async (event: DescopeSuccessPayload) => {
    setError('')
    setInteractionLoading(false)
    setLoading(true)

    // Navigate immediately after successful Descope auth to avoid perceived bounce.
    // Backend sync happens in background and should not block dashboard entry.
    navigate('/')

    try {
      const sessionJwt = event?.detail?.sessionJwt
      const user = await loginWithBackend(sessionJwt)
      persistAuthUser(user)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      console.warn('Post-login backend sync failed:', message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  const handleError = useCallback((event: unknown) => {
    setInteractionLoading(false)
    const message = event && typeof event === 'object' && 'detail' in event
      ? JSON.stringify((event as { detail: unknown }).detail)
      : 'Descope flow error'
    setError(message)
  }, [])

  const onScreenUpdate = useCallback((incomingScreenName: string, context: Record<string, unknown>, next: FlowNextFn) => {
    setInteractionLoading(false)
    setScreenName(incomingScreenName)
    setScreenContext(context)
    setNextAction(() => next)
    setError('')
    return true
  }, [])

  const submitInteraction = useCallback((interactionId: string, form: Record<string, unknown> = {}) => {
    if (!nextAction) {
      return
    }
    setInteractionLoading(true)
    nextAction(interactionId, form)
  }, [nextAction])

  const continueButtonText = interactionLoading ? 'Please wait...' : 'Continue'

  const renderCustomScreen = () => {
    switch (screenName) {
      case 'Welcome':
        return (
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

            <button
              className="submit-button"
              type="button"
              disabled={interactionLoading}
              onClick={() => submitInteraction('Ppb_65tyyn', { email })}
            >
              {continueButtonText}
            </button>

            <p className="naira-auth-continue-note">Continue securely with your NairaTrader account.</p>
          </div>
        )

      case 'Sign In':
        return (
          <div className="naira-auth-stack">
            <label className="form-label naira-auth-label">Password</label>
            <div className="input-group">
              <i className="fas fa-lock input-icon" />
              <input
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              className="submit-button"
              type="button"
              disabled={interactionLoading}
              onClick={() => submitInteraction('pXVwWREG7M', { password })}
            >
              {continueButtonText}
            </button>

            <p className="naira-auth-continue-note">Continue securely with your NairaTrader account.</p>

            <button
              className="submit-button naira-auth-secondary-btn"
              type="button"
              disabled={interactionLoading}
              onClick={() => submitInteraction('tZbr-2eP17')}
            >
              {interactionLoading ? 'Please wait...' : 'Forgot password'}
            </button>
          </div>
        )

      case 'Verify OTP': {
        const maskedEmail =
          typeof screenContext.sentTo === 'object' && screenContext.sentTo !== null && 'maskedEmail' in screenContext.sentTo
            ? String((screenContext.sentTo as { maskedEmail: unknown }).maskedEmail ?? '')
            : ''

        return (
          <div className="naira-auth-stack">
            <p className="naira-auth-helper">
              Enter the 6-digit code sent to {maskedEmail || 'your email'}
            </p>
            <div className="input-group">
              <i className="fas fa-key input-icon" />
              <input
                className="form-input"
                type="text"
                placeholder="Enter OTP"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <button
              className="submit-button"
              type="button"
              disabled={interactionLoading}
              onClick={() => submitInteraction('SgSm98sFRr', { code })}
            >
              {interactionLoading ? 'Please wait...' : 'Verify code'}
            </button>

            <button
              className="submit-button naira-auth-secondary-btn"
              type="button"
              disabled={interactionLoading}
              onClick={() => submitInteraction('resend')}
            >
              {interactionLoading ? 'Please wait...' : 'Send again'}
            </button>
          </div>
        )
      }

      case 'Set Password':
        return (
          <div className="naira-auth-stack">
            <label className="form-label naira-auth-label">Password</label>
            <div className="input-group">
              <i className="fas fa-lock input-icon" />
              <input
                className="form-input"
                type="password"
                placeholder="Create password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
              />
            </div>

            <button
              className="submit-button"
              type="button"
              disabled={interactionLoading}
              onClick={() => submitInteraction('n6WbbqzlwS', { newPassword, confirmPassword })}
            >
              {continueButtonText}
            </button>
          </div>
        )

      case 'Replace Expired Password':
        return (
          <div className="naira-auth-stack">
            <label className="form-label naira-auth-label">Existing Password</label>
            <div className="input-group">
              <i className="fas fa-lock input-icon" />
              <input
                className="form-input"
                type="password"
                placeholder="Existing password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <label className="form-label naira-auth-label">New Password</label>
            <div className="input-group">
              <i className="fas fa-lock input-icon" />
              <input
                className="form-input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
              />
            </div>

            <button
              className="submit-button"
              type="button"
              disabled={interactionLoading}
              onClick={() => submitInteraction('update-password', { password, newPassword, confirmPassword })}
            >
              {interactionLoading ? 'Please wait...' : 'Update Password'}
            </button>
          </div>
        )

      default:
        return <p className="naira-auth-helper">Loading authentication step...</p>
    }
  }

  if (!projectId) {
    return (
      <div className="naira-auth-error">
        Missing <code>VITE_DESCOPE_PROJECT_ID</code>.
      </div>
    )
  }

  return (
    <div>
      <h2 className="form-title">{title}</h2>
      <p className="naira-auth-subtitle">{subtitle}</p>

      <Descope
        flowId="sign-up-or-in-passwords"
        onSuccess={handleSuccess}
        onError={handleError}
        onScreenUpdate={onScreenUpdate}
      >
        {renderCustomScreen()}
      </Descope>

      {loading && <p className="naira-auth-helper">Finalizing sign in...</p>}
      {error && <p className="naira-auth-error">{error}</p>}
    </div>
  )
}

export default DescopeAuthCard
