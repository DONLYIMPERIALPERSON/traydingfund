import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DesktopFooter from '../components/DesktopFooter'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import {
  fetchUserChallengeAccountDetail,
  type BreezyHealthyDay,
  type BreezyTradeCard,
  type BreezyTransparency,
  type UserChallengeAccountDetailResponse,
} from '../lib/traderAuth'
import '../styles/DesktopBreezyAnalyticsPage.css'

const ITEMS_PER_PAGE = 5

const formatCurrency = (value: number, currencyCode: string) => {
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

const formatSigned = (value: number, currencyCode: string) => `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value), currencyCode)}`

const formatMs = (value?: number | null) => {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const toneFromDelta = (value: number) => {
  if (value > 0) return 'good'
  if (value < 0) return 'bad'
  return 'neutral'
}

const percent = (value?: number | null) => `${(((value ?? 0) as number) * 100).toFixed(2)}%`

const InsightCard = ({ label, value }: { label: string; value: number }) => (
  <div className="breezy-insight-card">
    <span>{label}</span>
    <strong className={value < 0 ? 'negative' : 'neutral'}>{value}</strong>
  </div>
)

const BreezyAnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [data, setData] = useState<UserChallengeAccountDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const challengeId = searchParams.get('challenge_id')

  useEffect(() => {
    if (!challengeId) {
      setError('Challenge ID is required')
      setLoading(false)
      return
    }

    setLoading(true)
    fetchUserChallengeAccountDetail(challengeId)
      .then((response) => {
        setData(response)
        setError('')
      })
      .catch(() => setError('service_unavailable'))
      .finally(() => setLoading(false))
  }, [challengeId])

  const breezy = data?.metrics?.breezy
  const transparency = (breezy?.transparency ?? data?.breezy?.transparency ?? null) as BreezyTransparency | null
  const components = breezy?.risk_components as Record<string, unknown> | null
  const behaviorPenalties = (components?.behavior_penalties as Record<string, number> | undefined) ?? {}
  const tradeCards = useMemo(() => (transparency?.trade_cards ?? []) as BreezyTradeCard[], [transparency])
  const healthyDays = useMemo(() => (transparency?.healthy_days ?? []) as BreezyHealthyDay[], [transparency])
  const scoreBreakdown = transparency?.score_breakdown
  const totalPages = Math.max(1, Math.ceil(tradeCards.length / ITEMS_PER_PAGE))
  const pagedTrades = tradeCards.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => {
    setPage(1)
  }, [challengeId])

  if (loading) {
    return <div className="desktop-breezy-analytics-page"><DesktopHeader /><DesktopSidebar /><div className="breezy-analytics-loading">Loading Breezy Analytics...</div></div>
  }

  if (error || !data) {
    return <div className="desktop-breezy-analytics-page"><DesktopHeader /><DesktopSidebar /><div className="breezy-analytics-fallback">{error === 'service_unavailable' ? <ServiceUnavailableState onRetry={() => window.location.reload()} /> : error}</div><DesktopFooter /></div>
  }

  if (String(data.challenge_type ?? '').toLowerCase() !== 'breezy') {
    return <div className="desktop-breezy-analytics-page"><DesktopHeader /><DesktopSidebar /><div className="breezy-analytics-fallback"><div className="breezy-analytics-empty">Breezy Analytics is only available for Breezy accounts.</div></div><DesktopFooter /></div>
  }

  const currency = (data.currency ?? 'USD').toUpperCase()
  const riskScore = Number(breezy?.risk_score ?? data.breezy?.risk_score ?? 0)
  const band = String(breezy?.risk_score_band ?? data.breezy?.risk_score_band ?? 'N/A')
  const split = Number(breezy?.effective_profit_split_percent ?? data.breezy?.profit_split_percent ?? 0)

  return (
    <div className="desktop-breezy-analytics-page">
      <DesktopHeader />
      <DesktopSidebar />
      <main className="breezy-analytics-content">
        <div className="back-button">
          <button onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left"></i>
            Back to Accounts Overview
          </button>
        </div>

        <div className="page-header breezy-page-header">
          <div className="page-header-content">
            <h1>Breezy Analytics</h1>
            <p>{data.mt5_account ?? data.challenge_id} • Transparent professional behavior analytics</p>
          </div>
        </div>

        <section className="breezy-section">
          <h2>Overview</h2>
          <div className="breezy-overview-grid">
            <div className="breezy-stat-card"><span>Current Score</span><strong>{riskScore}</strong></div>
            <div className="breezy-stat-card"><span>Band</span><strong>{band}</strong></div>
            <div className="breezy-stat-card"><span>Profit Split</span><strong>{split}%</strong></div>
            <div className="breezy-stat-card"><span>Healthy Days</span><strong>{healthyDays.filter((day) => day.healthy).length}</strong></div>
          </div>
        </section>

        <section className="breezy-section">
          <h2>Behaviour Insight</h2>
          <div className="breezy-insights-grid">
            <InsightCard label="Rapid Entries" value={Number(behaviorPenalties.rapid_same_pair_entries ?? 0)} />
            <InsightCard label="Fast Closures" value={Number(behaviorPenalties.repeated_fast_closures ?? 0)} />
            <InsightCard label="Lot Consistency" value={Number(behaviorPenalties.inconsistent_lot_sizing ?? 0)} />
          </div>
        </section>

        <section className="breezy-section">
          <h2>Score Progress</h2>
          <div className="breezy-score-breakdown">
            <div><span>Trades Contribution</span><strong>{scoreBreakdown?.trades_contribution ?? 0}</strong></div>
            <div><span>Behavior Contribution</span><strong>{scoreBreakdown?.behavior_contribution ?? 0}</strong></div>
            <div><span>Healthy Day Bonus</span><strong>{scoreBreakdown?.healthy_day_bonus ?? 0}</strong></div>
            <div><span>Final Breezy Score</span><strong>{scoreBreakdown?.final_breezy_score ?? riskScore}</strong></div>
          </div>
          <div className="breezy-timeline-chart">
            {tradeCards.map((trade, index) => {
              const value = Number(trade.new_score ?? 0)
              const height = Math.max(12, Math.min(100, Math.abs(value) * 2 + 12))
              return (
                <div key={`${trade.deal_id ?? trade.position_id ?? index}`} className="breezy-timeline-bar-wrap" title={`${trade.symbol ?? 'Trade'} • ${value}`}>
                  <div className={`breezy-timeline-bar ${toneFromDelta(value)}`} style={{ height }} />
                  <span>{index + 1}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="breezy-section">
          <div className="breezy-section-head">
            <div>
              <h2>Trade Evaluations</h2>
              <p>Per-trade score cards</p>
            </div>
            <div className="breezy-pagination">
              <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Prev</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
            </div>
          </div>

          <div className="breezy-trade-grid">
            {pagedTrades.map((trade, index) => {
              const profit = Number(trade.profit ?? 0)
              const finalDelta = Number(trade.final_trade_delta ?? 0)
              const behaviorAdjustment = Number(trade.behavior_adjustment ?? 0)
              return (
                <article key={`${trade.deal_id ?? trade.position_id ?? index}`} className="breezy-trade-card">
                  <div className="breezy-trade-card__header">
                    <div>
                      <h3>{trade.symbol ?? 'Trade'}</h3>
                      <p>{formatMs(trade.opened_at_ms)} → {formatMs(trade.closed_at_ms)}</p>
                    </div>
                    <strong className={profit >= 0 ? 'good' : 'bad'}>{formatSigned(profit, currency)}</strong>
                  </div>

                  <div className="breezy-trade-card__stats">
                    <div><span>Lot Size</span><strong>{trade.volume ?? 0}</strong></div>
                    <div><span>Trade Score</span><strong>{trade.trade_score ?? 0}</strong></div>
                    <div><span>Behavior Impact</span><strong>{behaviorAdjustment}</strong></div>
                    <div><span>Final Delta</span><strong className={toneFromDelta(finalDelta)}>{finalDelta}</strong></div>
                  </div>

                  <div className="breezy-trade-card__explanation">
                    <div><span>Risk Usage</span><strong>{trade.risk_usage_score ?? 0}</strong></div>
                    <div><span>Efficiency</span><strong>{trade.efficiency_score ?? 0}</strong></div>
                    <div><span>Duration</span><strong>{trade.duration_score ?? 0}</strong></div>
                    <div><span>Rapid Entries</span><strong>{trade.behavior_details?.rapid_same_pair_entries ?? 0}</strong></div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
      <DesktopFooter />
    </div>
  )
}

export default BreezyAnalyticsPage