import React, { useCallback, useState } from 'react'
import { Descope } from '@descope/react-sdk'

import './DescopeAuthCard.css'


type DescopeAuthCardProps = {
  title: string
  subtitle: string
  onSuccess?: (event: any) => void
  onError?: (event: any) => void
}

const projectId = import.meta.env.VITE_DESCOPE_PROJECT_ID ?? ''

type FlowNextFn = (interactionId: string, form: Record<string, any>) => Promise<unknown>
type DescopeSuccessPayload = {
  detail?: {
    sessionJwt?: string
  }
}

function toSafeAuthErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const message = err.message.toLowerCase()

    if (message.includes('failed to fetch') || message.includes('network')) {
      return 'Network error. Please check your connection and try again.'
    }

    if (
      message.includes('401')
      || message.includes('unauthorized')
      || message.includes('invalid')
      || message.includes('authentication failed')
    ) {
      return 'Unable to sign in with those details. Please try again.'
    }

    if (message.includes('no descope session token')) {
      return 'Your session has expired. Please try again.'
    }
  }

  return 'Unable to sign in right now. Please try again shortly.'
}

const DescopeAuthCard: React.FC<DescopeAuthCardProps> = ({ title, subtitle, onSuccess, onError }) => {
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

    try {
      if (onSuccess) {
        onSuccess(event)
      }
    } catch (err) {
      console.error('Authentication success handler failed', err)
      setError(toSafeAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [onSuccess])

  const handleError = useCallback((event: unknown) => {
    setInteractionLoading(false)
    console.error('Descope flow error', event)
    setError('Authentication failed. Please check your details and try again.')

    if (onError) {
      onError(event)
    }
  }, [onError])

  const onScreenUpdate = useCallback((incomingScreenName: string, context: Record<string, any>, next: FlowNextFn, _ref: HTMLElement) => {
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
    if (loading) {
      return
    }
    setInteractionLoading(true)
    nextAction(interactionId, form)
  }, [loading, nextAction])

  const isBusy = interactionLoading || loading
  const continueButtonText = isBusy ? 'Please wait...' : 'Continue'

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
              disabled={isBusy}
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
              disabled={isBusy}
              onClick={() => submitInteraction('pXVwWREG7M', { password })}
            >
              {loading ? 'Signing in...' : continueButtonText}
            </button>

            <p className="naira-auth-continue-note">Continue securely with your NairaTrader account.</p>

            <button
              className="submit-button naira-auth-secondary-btn"
              type="button"
              disabled={isBusy}
              onClick={() => submitInteraction('tZbr-2eP17')}
            >
              {isBusy ? 'Please wait...' : 'Forgot password'}
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
              disabled={isBusy}
              onClick={() => submitInteraction('SgSm98sFRr', { code })}
            >
              {isBusy ? 'Please wait...' : 'Verify code'}
            </button>

            <button
              className="submit-button naira-auth-secondary-btn"
              type="button"
              disabled={isBusy}
              onClick={() => submitInteraction('resend')}
            >
              {isBusy ? 'Please wait...' : 'Send again'}
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
              disabled={isBusy}
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
              disabled={isBusy}
              onClick={() => submitInteraction('update-password', { password, newPassword, confirmPassword })}
            >
              {isBusy ? 'Please wait...' : 'Update Password'}
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