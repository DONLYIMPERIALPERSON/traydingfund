import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import { fetchUserChallengeAccounts, type UserChallengeAccountListItem } from '../lib/traderAuth'
import '../styles/MobileHistoryPage.css'

const HIDDEN_BREACHED_ACCOUNTS_KEY = 'trader_area_hidden_breached_accounts'

const isHistoryEligibleAccount = (account: UserChallengeAccountListItem) => {
  const value = String(account.display_status ?? account.objective_status ?? '').trim().toLowerCase()
  return value !== 'active' && value !== 'awaiting reset'
}

const formatChallengeType = (value?: string) => {
  if (!value) return 'Challenge'
  const normalized = value.replace(/-/g, '_').toLowerCase()
  switch (normalized) {
    case 'two_step':
    case 'challenge':
      return '2 Step Challenge'
    case 'one_step':
      return '1 Step Challenge'
    case 'instant_funded':
      return 'Instant Funded'
    case 'funded':
      return 'Funded'
    default:
      return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  }
}

const formatPhase = (value?: string) => {
  if (!value) return ''
  const normalized = value.replace(/-/g, '_').toLowerCase()
  if (normalized === 'phase_1' || normalized === 'phase1') return 'Phase 1'
  if (normalized === 'phase_2' || normalized === 'phase2') return 'Phase 2'
  if (normalized === 'funded') return 'Funded'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

const MobileHistoryPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accounts, setAccounts] = useState<UserChallengeAccountListItem[]>([])
  const [hiddenBreachedAccounts, setHiddenBreachedAccounts] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_BREACHED_ACCOUNTS_KEY)
      return raw ? JSON.parse(raw) as string[] : []
    } catch {
      return []
    }
  })

  const loadAccounts = () => {
    setLoading(true)
    setError('')
    fetchUserChallengeAccounts()
      .then((res) => {
        setAccounts([...res.active_accounts, ...res.history_accounts].filter(isHistoryEligibleAccount))
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load history')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => {
      const dateA = new Date(a.breached_at ?? a.passed_at ?? a.started_at ?? 0).getTime()
      const dateB = new Date(b.breached_at ?? b.passed_at ?? b.started_at ?? 0).getTime()
      return dateB - dateA
    }),
    [accounts],
  )

  const handleToggleHidden = (challengeId: string) => {
    setHiddenBreachedAccounts((current) => {
      const next = current.includes(challengeId)
        ? current.filter((item) => item !== challengeId)
        : [...current, challengeId]
      localStorage.setItem(HIDDEN_BREACHED_ACCOUNTS_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="mobile-history-page">
      <div className="mobile-history-shell">
        <header className="mobile-history-header">
          <button type="button" className="mobile-history-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-history-header__text">
            <h1>History</h1>
            <p>Manage breached accounts visibility on overview.</p>
          </div>
          <button type="button" className="mobile-history-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        {loading ? (
          <div className="mobile-history-empty">Loading history...</div>
        ) : error ? (
          <ServiceUnavailableState onRetry={loadAccounts} />
        ) : sortedAccounts.length === 0 ? (
          <div className="mobile-history-empty">No breached account yet.</div>
        ) : (
          <section className="mobile-history-list">
            {sortedAccounts.map((account) => {
              const hidden = hiddenBreachedAccounts.includes(account.challenge_id)
              return (
                <article key={account.challenge_id} className="mobile-history-card">
                  <div className="mobile-history-card__top">
                    <div>
                      <strong>{formatChallengeType(account.challenge_type)}</strong>
                      <p>{formatPhase(account.phase)} · {account.mt5_account ?? account.challenge_id}</p>
                    </div>
                    <span className="mobile-history-card__status">{account.display_status}</span>
                  </div>

                  <div className="mobile-history-card__bottom">
                    <div className="mobile-history-card__toggle-copy">
                      Hide on overview
                    </div>
                    <button
                      type="button"
                      className={`mobile-history-toggle ${hidden ? 'is-on' : ''}`}
                      onClick={() => handleToggleHidden(account.challenge_id)}
                      aria-pressed={hidden}
                    >
                      <span />
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </div>
  )
}

export default MobileHistoryPage