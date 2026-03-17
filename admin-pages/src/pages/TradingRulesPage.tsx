import { useEffect, useState } from 'react'
import {
  fetchTradingObjectives,
  updateTradingObjectives,
  type TradingObjectivesConfig,
  type TradingObjectivesResponse,
} from '../lib/adminMock'
import './TradingRulesPage.css'

type RuleItem = {
  key: string
  label: string
  value: string
}

type PhaseItem = {
  key: string
  label: string
  rules: RuleItem[]
}

type ChallengeTypeItem = {
  key: string
  label: string
  phases: PhaseItem[]
}

type EditableConfig = {
  challenge_types: ChallengeTypeItem[]
}

const TradingRulesPage = () => {
  const [config, setConfig] = useState<EditableConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await fetchTradingObjectives()
        setConfig((response as TradingObjectivesResponse).rules as EditableConfig)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trading objectives')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const updateRuleValue = (challengeIndex: number, phaseIndex: number, ruleIndex: number, value: string) => {
    if (!config) return
    const updated: EditableConfig = {
      challenge_types: config.challenge_types.map((challenge, cIdx) => {
        if (cIdx !== challengeIndex) return challenge
        return {
          ...challenge,
          phases: challenge.phases.map((phase, pIdx) => {
            if (pIdx !== phaseIndex) return phase
            return {
              ...phase,
              rules: phase.rules.map((rule, rIdx) => (rIdx === ruleIndex ? { ...rule, value } : rule)),
            }
          }),
        }
      }),
    }
    setConfig(updated)
  }

  const handleSave = async () => {
    if (!config) return
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      const payload: TradingObjectivesConfig = config
      const response = await updateTradingObjectives({ rules: payload })
      setConfig((response as TradingObjectivesResponse).rules as EditableConfig)
      setSuccess('Trading objectives updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trading objectives')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-dashboard-card">
        <h2>Trading Rules</h2>
        <p>Manage the rules shown to traders across challenge types and phases.</p>
        {error && <p className="trading-rules-alert trading-rules-alert--error">{error}</p>}
        {success && <p className="trading-rules-alert trading-rules-alert--success">{success}</p>}
      </div>

      {loading ? (
        <div className="admin-dashboard-card">
          <p>Loading trading objectives...</p>
        </div>
      ) : (
        <div className="trading-rules-grid">
          {config?.challenge_types.map((challenge, challengeIndex) => (
            <div key={challenge.key} className="admin-dashboard-card trading-rules-card">
              <div className="trading-rules-header">
                <h3>{challenge.label}</h3>
                <span>{challenge.phases.length} phase{challenge.phases.length > 1 ? 's' : ''}</span>
              </div>

              {challenge.phases.map((phase, phaseIndex) => (
                <div key={phase.key} className="trading-rules-phase">
                  <h4>{phase.label}</h4>
                  <div className="trading-rules-rule-grid">
                    {phase.rules.map((rule, ruleIndex) => (
                      <label key={rule.key} className="trading-rules-field">
                        <span>{rule.label}</span>
                        <input
                          type="text"
                          value={rule.value}
                          onChange={(event) =>
                            updateRuleValue(challengeIndex, phaseIndex, ruleIndex, event.target.value)
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="admin-dashboard-card trading-rules-actions">
        <button type="button" className="settings-create-btn" onClick={handleSave} disabled={saving || loading || !config}>
          {saving ? 'Saving...' : 'Save Trading Rules'}
        </button>
      </div>
    </section>
  )
}

export default TradingRulesPage