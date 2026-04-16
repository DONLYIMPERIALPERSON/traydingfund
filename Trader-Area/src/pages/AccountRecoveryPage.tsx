import React, { useEffect, useMemo, useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import { fetchCurrentUser, fetchMyAccountRecoveryRequests, submitAccountRecoveryRequest, type AccountRecoveryRequestItem } from '../lib/traderAuth'

const phaseOptions = ['Phase 1', 'Phase 2', 'Funded']
const accountTypeOptions: Record<string, string[]> = {
  '2 Step': ['$2,000', '$10,000', '$30,000', '$50,000', '$100,000', '$200,000'],
  '1 Step': ['$2,000', '$10,000', '$30,000', '$50,000', '$100,000', '$200,000'],
  'Instant Funded': ['$2,000', '$10,000', '$30,000', '$50,000', '$100,000', '$200,000'],
  'Standard Account': ['₦200,000', '₦500,000', '₦800,000'],
  'Flexi Account': ['₦200,000', '₦500,000', '₦800,000'],
}

const AccountRecoveryPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [platform, setPlatform] = useState<'ctrader' | 'mt5'>('ctrader')
  const [phase, setPhase] = useState('')
  const [accountType, setAccountType] = useState('')
  const [accountSize, setAccountSize] = useState('')
  const [requests, setRequests] = useState<AccountRecoveryRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [me, response] = await Promise.all([fetchCurrentUser(), fetchMyAccountRecoveryRequests()])
      setEmail(me.email)
      setRequests(response.requests)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account recovery page')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const availableSizes = useMemo(() => accountTypeOptions[accountType] ?? [], [accountType])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setSubmitting(true)
      setError('')
      setSuccess('')
      await submitAccountRecoveryRequest({
        email,
        account_number: accountNumber,
        platform,
        phase,
        account_type: accountType,
        account_size: accountSize,
      })
      setSuccess('Recovery request submitted successfully.')
      setAccountNumber('')
      setPlatform('ctrader')
      setPhase('')
      setAccountType('')
      setAccountSize('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit recovery request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <DesktopHeader />
      <DesktopSidebar />
      <div style={{ marginLeft: '280px', padding: '24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, color: '#111827' }}>Account Recovery</h1>
            <p style={{ color: '#6b7280' }}>Submit lost account details for manual restoration and track review status.</p>
          </div>

          {loading ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: 24 }}>Loading...</div>
          ) : error && requests.length === 0 ? (
            <ServiceUnavailableState onRetry={() => void load()} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24 }}>
              <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, display: 'grid', gap: 16 }}>
                <h3 style={{ margin: 0 }}>Apply for account recovery</h3>
                <input value={email} readOnly placeholder="Email" style={{ padding: 12, borderRadius: 10, border: '1px solid #d1d5db' }} />
                <select value={platform} onChange={(e) => setPlatform(e.target.value as 'ctrader' | 'mt5')} required style={{ padding: 12, borderRadius: 10, border: '1px solid #d1d5db' }}>
                  <option value="ctrader">cTrader</option>
                  <option value="mt5">MT5</option>
                </select>
                <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account number" required style={{ padding: 12, borderRadius: 10, border: '1px solid #d1d5db' }} />
                <select value={accountType} onChange={(e) => { setAccountType(e.target.value); setAccountSize('') }} required style={{ padding: 12, borderRadius: 10, border: '1px solid #d1d5db' }}>
                  <option value="">Select account type</option>
                  {Object.keys(accountTypeOptions).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={accountSize} onChange={(e) => setAccountSize(e.target.value)} required disabled={!accountType} style={{ padding: 12, borderRadius: 10, border: '1px solid #d1d5db' }}>
                  <option value="">Select account size</option>
                  {availableSizes.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={phase} onChange={(e) => setPhase(e.target.value)} required style={{ padding: 12, borderRadius: 10, border: '1px solid #d1d5db' }}>
                  <option value="">Select phase</option>
                  {phaseOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                {success && <div style={{ color: '#065f46', background: '#d1fae5', padding: 12, borderRadius: 10 }}>{success}</div>}
                {error && <div style={{ color: '#991b1b', background: '#fee2e2', padding: 12, borderRadius: 10 }}>{error}</div>}
                <button type="submit" disabled={submitting} style={{ padding: 14, borderRadius: 10, border: 'none', background: '#111827', color: '#fff', fontWeight: 700 }}>
                  {submitting ? 'Submitting...' : 'Submit Recovery Request'}
                </button>
              </form>

              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24 }}>
                <h3 style={{ marginTop: 0 }}>My recovery requests</h3>
                {requests.length === 0 ? (
                  <p style={{ color: '#6b7280' }}>No recovery requests submitted yet.</p>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {requests.map((request) => (
                      <div key={request.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <strong>{request.account_number}</strong>
                          <span style={{ textTransform: 'capitalize', color: request.status === 'approved' ? '#065f46' : request.status === 'declined' ? '#991b1b' : '#92400e' }}>{request.status}</span>
                        </div>
                        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>{request.platform?.toUpperCase()} • {request.account_type} • {request.account_size} • {request.phase}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Submitted: {new Date(request.submitted_at).toLocaleString()}</div>
                        {request.decline_reason && <div style={{ marginTop: 8, color: '#991b1b', fontSize: 13 }}>Decline reason: {request.decline_reason}</div>}
                        {request.review_note && <div style={{ marginTop: 8, color: '#374151', fontSize: 13 }}>Review note: {request.review_note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <DesktopFooter />
    </div>
  )
}

export default AccountRecoveryPage