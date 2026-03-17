import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import './TradingRulesPage.css'

type FxRatesConfig = {
  usd_ngn_rate: number
}

type FxRatesResponse = {
  id: number
  key: string
  label: string
  rules: FxRatesConfig
  updated_at: string
}

const FxRatesPage = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rates, setRates] = useState<FxRatesConfig>({ usd_ngn_rate: 1300 })

  useEffect(() => {
    const loadRates = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await apiFetch<FxRatesResponse>('/admin/fx-rates')
        setRates(response.rules)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load FX rates')
      } finally {
        setLoading(false)
      }
    }

    loadRates()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch<FxRatesResponse>('/admin/fx-rates', {
        method: 'PUT',
        body: JSON.stringify({ rates }),
      })
      setSuccess('FX rates updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update FX rates')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-trading-rules">
      <div className="admin-trading-rules-header">
        <div>
          <h1>FX Rates</h1>
          <p>Manage USD to NGN conversion rate used for bank transfers.</p>
        </div>
        <button
          className="admin-trading-rules-save"
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {loading && <p className="admin-trading-rules-loading">Loading FX rates...</p>}
      {error && <p className="admin-trading-rules-error">{error}</p>}
      {success && <p className="admin-trading-rules-success">{success}</p>}

      {!loading && (
        <div className="admin-trading-rules-section">
          <div className="admin-trading-rule-card">
            <div className="admin-trading-rule-card-header">
              <h3>USD → NGN Rate</h3>
              <span className="admin-trading-rule-tag">Bank Transfer</span>
            </div>
            <div className="admin-trading-rule-field">
              <label htmlFor="usd-ngn-rate">Rate</label>
              <input
                id="usd-ngn-rate"
                type="number"
                min="1"
                step="1"
                value={rates.usd_ngn_rate}
                onChange={(event) => setRates({ usd_ngn_rate: Number(event.target.value) })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FxRatesPage