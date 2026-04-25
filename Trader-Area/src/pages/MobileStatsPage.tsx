import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import {
  fetchUserChallengeAccountDetail,
  fetchUserChallengeCalendar,
  type UserChallengeAccountDetailResponse,
  type UserChallengeCalendarDay,
} from '../lib/traderAuth'
import '../styles/MobileStatsPage.css'

const formatCurrency = (value: number | null, currencyCode: string) => {
  if (value == null || !Number.isFinite(value)) return 'N/A'
  const normalized = currencyCode.toUpperCase()
  if (normalized === 'NGN') {
    return `₦${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalized,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatPercent = (value: number | null) => {
  if (value == null || !Number.isFinite(value)) return 'N/A'
  return `${value.toFixed(2)}%`
}

const resolveWinRatePercent = (value: number | null | undefined, closedTradesCount: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return null
  if (!closedTradesCount || closedTradesCount <= 0) return null
  return value <= 1 ? value * 100 : value
}

const formatNumber = (value: number | null, maximumFractionDigits = 2) => {
  if (value == null || !Number.isFinite(value)) return 'N/A'
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits })
}

const formatAccountAge = (startedAt?: string | null) => {
  if (!startedAt) return 'N/A'
  const parsed = new Date(startedAt)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  const diffMs = Date.now() - parsed.getTime()
  if (diffMs < 0) return '0d'
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays < 1) {
    const diffHours = Math.max(1, Math.floor(diffMs / (60 * 60 * 1000)))
    return `${diffHours}h`
  }
  return `${diffDays}d`
}

const computeSharpeRatio = (entries: UserChallengeCalendarDay[], initialBalance: number) => {
  if (!entries.length || !Number.isFinite(initialBalance) || initialBalance <= 0) return null
  const returns = entries
    .map((entry) => entry.pnl / initialBalance)
    .filter((value) => Number.isFinite(value))
  if (returns.length < 2) return null
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance = returns.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (returns.length - 1)
  const stdDev = Math.sqrt(variance)
  if (!Number.isFinite(stdDev) || stdDev === 0) return null
  return (mean / stdDev) * Math.sqrt(returns.length)
}

const computeProfitFactor = (entries: UserChallengeCalendarDay[]) => {
  const grossProfit = entries
    .filter((entry) => entry.pnl > 0)
    .reduce((sum, entry) => sum + entry.pnl, 0)
  const grossLoss = Math.abs(entries
    .filter((entry) => entry.pnl < 0)
    .reduce((sum, entry) => sum + entry.pnl, 0))
  if (grossProfit <= 0) return 0
  if (grossLoss <= 0) return grossProfit
  return grossProfit / grossLoss
}

const computeArrr = (entries: UserChallengeCalendarDay[]) => {
  const positiveEntries = entries.filter((entry) => entry.pnl > 0)
  const negativeEntries = entries.filter((entry) => entry.pnl < 0)
  if (!positiveEntries.length || !negativeEntries.length) return null
  const avgGain = positiveEntries.reduce((sum, entry) => sum + entry.pnl, 0) / positiveEntries.length
  const avgLoss = Math.abs(negativeEntries.reduce((sum, entry) => sum + entry.pnl, 0) / negativeEntries.length)
  if (!Number.isFinite(avgLoss) || avgLoss === 0) return null
  return avgGain / avgLoss
}

const parseAccountSize = (value?: string | null) => {
  if (!value) return 0
  const parsed = Number(String(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const MobileStatsPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [accountData, setAccountData] = useState<UserChallengeAccountDetailResponse | null>(null)
  const [calendarEntries, setCalendarEntries] = useState<UserChallengeCalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const challengeId = searchParams.get('challenge_id')

  const loadStatsData = useCallback(async () => {
    if (!challengeId) return
    try {
      const [detail, calendar] = await Promise.all([
        fetchUserChallengeAccountDetail(challengeId),
        fetchUserChallengeCalendar(challengeId),
      ])
      setAccountData(detail)
      setCalendarEntries(calendar.daily_pnl ?? [])
      setError('')
    } catch {
      setError('service_unavailable')
    }
  }, [challengeId])

  useEffect(() => {
    if (!challengeId) {
      setError('Challenge ID is required')
      setLoading(false)
      return
    }

    setLoading(true)
    loadStatsData().finally(() => setLoading(false))
  }, [challengeId, loadStatsData])

  const accountCurrency = (accountData?.currency || 'USD').toUpperCase()

  const statCards = useMemo(() => {
    if (!accountData) return []

    const initialBalance = accountData.initial_balance ?? parseAccountSize(accountData.account_size)
    const profitableEntries = calendarEntries.filter((entry) => entry.pnl > 0)
    const lossEntries = calendarEntries.filter((entry) => entry.pnl < 0)
    const profitableDays = profitableEntries.length
    const biggestGain = profitableEntries.length ? Math.max(...profitableEntries.map((entry) => entry.pnl)) : null
    const biggestLoss = lossEntries.length ? Math.min(...lossEntries.map((entry) => entry.pnl)) : null
    const profitFactor = (profitableEntries.length && lossEntries.length)
      ? computeProfitFactor(calendarEntries)
      : null
    const sharpeRatio = computeSharpeRatio(calendarEntries, initialBalance)
    const arrr = (profitableEntries.length && lossEntries.length) ? computeArrr(calendarEntries) : null
    const closedTradesCount = accountData.metrics.closed_trades_count ?? 0
    const resolvedWinRate = resolveWinRatePercent(accountData.metrics.win_rate, closedTradesCount)

    return [
      { label: 'Win Rate', value: closedTradesCount > 0 ? formatPercent(resolvedWinRate) : 'No closed trades' },
      { label: 'Profit Factor', value: profitFactor != null ? formatNumber(profitFactor) : 'No closed profit/loss trades' },
      { label: 'Sharp Ratio', value: closedTradesCount > 1 ? formatNumber(sharpeRatio) : 'Not enough data' },
      { label: 'Number of Trades', value: closedTradesCount > 0 ? formatNumber(closedTradesCount, 0) : 'No closed trades' },
      { label: 'Account Age', value: formatAccountAge(accountData.started_at) },
      { label: 'Profitable Days', value: profitableDays > 0 ? formatNumber(profitableDays, 0) : 'No profit days' },
      { label: 'ARRR', value: arrr != null ? formatNumber(arrr) : 'No closed profit/loss trades' },
      { label: 'Most Traded Symbol', value: 'Trade symbol data unavailable' },
      { label: 'Biggest Loss', value: biggestLoss != null ? formatCurrency(biggestLoss, accountCurrency) : 'No closed loss trades' },
      { label: 'Biggest Gain', value: biggestGain != null ? formatCurrency(biggestGain, accountCurrency) : 'No closed profit trades' },
    ]
  }, [accountCurrency, accountData, calendarEntries])

  if (loading) {
    return (
      <div className="mobile-stats-page">
        <div className="mobile-stats-loading">Loading stats...</div>
      </div>
    )
  }

  if (error || !accountData) {
    return (
      <div className="mobile-stats-page">
        <div className="mobile-stats-shell">
          {error === 'service_unavailable'
            ? <ServiceUnavailableState onRetry={() => void loadStatsData()} />
            : <div className="mobile-stats-error">{error || 'Stats unavailable'}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-stats-page">
      <div className="mobile-stats-shell">
        <header className="mobile-stats-header">
          <button type="button" className="mobile-stats-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-stats-header__text">
            <h1>Stats</h1>
            <p>{accountData.mt5_account ?? 'Pending'} · {accountData.phase}</p>
          </div>
          <button type="button" className="mobile-stats-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        <section className="mobile-stats-grid">
          {statCards.map((stat) => (
            <article key={stat.label} className="mobile-stats-card">
              <span className="mobile-stats-card__label">{stat.label}</span>
              <strong className="mobile-stats-card__value">{stat.value}</strong>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}

export default MobileStatsPage