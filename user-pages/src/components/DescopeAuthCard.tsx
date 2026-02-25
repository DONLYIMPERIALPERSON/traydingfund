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

    try {
      const sessionJwt = event?.detail?.sessionJwt
      const user = await loginWithBackend(sessionJwt)
      persistAuthUser(user)
      navigate('/')
    } catch (err) {
      console.error('Login finalization failed', err)
      setError(toSafeAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [navigate])

  const handleError = useCallback((event: unknown) => {
    setInteractionLoading(false)
    console.error('Descope flow error', event)

    // Try to extract error message from the event
    let errorMessage = 'Authentication failed. Please check your details and try again.'

    if (event && typeof event === 'object') {
      const errorEvent = event as any
      const message = errorEvent.message || errorEvent.error || errorEvent.detail ||
                     errorEvent.description || errorEvent.text
      if (message) {
        errorMessage = String(message).replace(/\s*-\s*Error\s*$/, '')
      }
    } else if (typeof event === 'string') {
      errorMessage = event.replace(/\s*-\s*Error\s*$/, '')
    }

    setError(errorMessage)
  }, [])

  const onScreenUpdate = useCallback((incomingScreenName: string, context: Record<string, unknown>, next: FlowNextFn) => {
    setInteractionLoading(false)
    setScreenName(incomingScreenName)
    setScreenContext(context)
    setNextAction(() => next)

    // Check for error messages in the context - Descope may pass errors here
    const errorMsg = context.errorMessage || context.error || context.message || context.error_description ||
                    (context as any).errorMsg || (context as any).err
    if (errorMsg) {
      let errorMessage = 'Authentication failed. Please try again.'
      if (typeof errorMsg === 'string') {
        errorMessage = errorMsg.replace(/\s*-\s*Error\s*$/, '')
      } else if (errorMsg && typeof errorMsg === 'object') {
        const errorObj = errorMsg as any
        // Handle Descope's specific error object format: {text: 'error message', type: 'errorType'}
        errorMessage = errorObj.text || errorObj.message || errorObj.error || String(errorMsg)
        errorMessage = errorMessage.replace(/\s*-\s*Error\s*$/, '')
      }
      setError(errorMessage)
    } else {
      setError('')
    }

    return true
  }, [])

  const submitInteraction = useCallback(async (interactionId: string, form: Record<string, unknown> = {}) => {
    if (!nextAction) {
      return
    }
    if (loading) {
      return
    }
    setInteractionLoading(true)
    try {
      await nextAction(interactionId, form)
    } catch (err) {
      console.error('Interaction error:', err)
      setInteractionLoading(false)
      // Try to extract error message from the error - handle different Descope error formats
      let errorMessage = 'Authentication failed. Please try again.'

      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err && typeof err === 'object') {
        // Check for common error message properties
        const errorObj = err as any
        errorMessage = errorObj.message || errorObj.error || errorObj.errorMessage ||
                      errorObj.description || errorObj.detail || String(err)
      }

      // Clean up the error message (remove " - Error" suffix if present)
      errorMessage = errorMessage.replace(/\s*-\s*Error\s*$/, '')

      setError(errorMessage)
    }
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!isBusy) {
                      submitInteraction('Ppb_65tyyn', { email });
                    }
                  }
                }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!isBusy) {
                      submitInteraction('pXVwWREG7M', { password });
                    }
                  }
                }}
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
