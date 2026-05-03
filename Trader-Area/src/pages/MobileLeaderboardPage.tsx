import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMobileLeaderboard, type MobileLeaderboardItem } from '../lib/traderAuth'
import '../styles/MobileLeaderboardPage.css'

type TabKey = 'all' | '1000000' | '800000' | '500000' | '200000'

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: '1000000', label: '1M' },
  { key: '800000', label: '800k' },
  { key: '500000', label: '500k' },
  { key: '200000', label: '200k' },
]

const formatByAccountCurrency = (value: number, accountType?: string, accountSize?: string) => {
  const type = String(accountType ?? '').toLowerCase()
  const size = String(accountSize ?? '')

  // Use account type as source of truth first
  if (type.includes('ngn') || type.includes('breezy')) {
    return `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
  }

  // Fallback to account-size symbol if present
  if (size.includes('$')) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  if (size.includes('₦')) {
    return `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
  }

  // Final fallback
  return `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
}

const formatAccountSizeLabel = (accountType?: string, accountSize?: string) => {
  const type = String(accountType ?? '').toLowerCase()
  const rawSize = String(accountSize ?? '').trim()
  const numeric = Number(rawSize.replace(/[^0-9]/g, ''))

  if (Number.isFinite(numeric) && numeric > 0) {
    if (type.includes('ngn') || type.includes('breezy')) {
      return `₦${numeric.toLocaleString('en-NG')}`
    }
    return `$${numeric.toLocaleString('en-US')}`
  }

  return rawSize || 'N/A'
}

const MobileLeaderboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState<MobileLeaderboardItem[]>([])

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchMobileLeaderboard()
      .then((res) => setItems(res.data ?? []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load leaderboard'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (activeTab === 'all') return items
    const size = Number(activeTab)
    return items.filter((item) => item.account_size_value === size)
  }, [activeTab, items])

  const topThree = filtered.slice(0, 3)
  const topTenList = filtered.slice(3, 10)

  return (
    <div className="mobile-leaderboard-page">
      <div className="mobile-leaderboard-shell">
        <header className="mobile-leaderboard-header">
          <button type="button" className="mobile-leaderboard-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-leaderboard-header__text">
            <h1>Leaderboard</h1>
          </div>
          <button type="button" className="mobile-leaderboard-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        <section className="mobile-leaderboard-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'is-active' : ''}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {loading ? <p className="mobile-leaderboard-state">Loading leaderboard...</p> : null}
        {error ? <p className="mobile-leaderboard-state">{error}</p> : null}

        {!loading && !error ? (
          <>
            <section className="mobile-leaderboard-top3">
              {topThree.map((item, index) => (
                <article
                  key={item.challenge_id}
                  className={`mobile-leaderboard-card mobile-leaderboard-card--top-${index + 1}`}
                >
                  <div className="mobile-leaderboard-card__top">
                    <div className="mobile-leaderboard-card__name-wrap">
                      <i className="fas fa-trophy" />
                      <strong>{item.nickname}</strong>
                    </div>
                    <span className="mobile-leaderboard-card__rank">{item.rank}</span>
                  </div>
                  <div className="mobile-leaderboard-card__metrics">
                    <div><small>Profit</small><strong>{formatByAccountCurrency(item.profit, item.account_type, item.account_size)}</strong></div>
                    <div><small>Equity</small><strong>{formatByAccountCurrency(item.equity, item.account_type, item.account_size)}</strong></div>
                    <div><small>Gain %</small><strong>{item.gain_percent.toFixed(2)}%</strong></div>
                  </div>
                  <div className="mobile-leaderboard-card__account">
                    <span>Account</span>
                    <strong>{item.account_type} {formatAccountSizeLabel(item.account_type, item.account_size)}</strong>
                  </div>
                </article>
              ))}
            </section>

            <section className="mobile-leaderboard-top10">
              <h2>Top 10</h2>
              {topTenList.map((item) => (
                <article key={item.challenge_id} className="mobile-leaderboard-row">
                  <div className="mobile-leaderboard-row__line">
                    <strong>{item.rank}</strong>
                    <span>{item.nickname}</span>
                    <span>{formatByAccountCurrency(item.profit, item.account_type, item.account_size)}</span>
                    <span>{formatByAccountCurrency(item.equity, item.account_type, item.account_size)}</span>
                    <span>{item.gain_percent.toFixed(2)}%</span>
                  </div>
                  <div className="mobile-leaderboard-row__account">Account: {item.account_type} {formatAccountSizeLabel(item.account_type, item.account_size)}</div>
                </article>
              ))}
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default MobileLeaderboardPage