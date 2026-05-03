import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import {
  fetchUserChallengeAccountDetail,
  type BreezyTradeCard,
  type BreezyTransparency,
  type UserChallengeAccountDetailResponse,
} from '../lib/traderAuth'
import '../styles/MobileBreezyAnalyticsPage.css'

const ITEMS_PER_PAGE = 5

const toneClass = (value: number) => {
  if (value > 0) return 'is-positive'
  if (value < 0) return 'is-negative'
  return 'is-neutral'
}

const MobileBreezyAnalyticsPage: React.FC = () => {
  const navigate = useNavigate()

  const [searchParams] = useSearchParams()

  const [data, setData] =
    useState<UserChallengeAccountDetailResponse | null>(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [page, setPage] = useState(1)

  const challengeId =
    searchParams.get('challenge_id')

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
      .catch(() =>
        setError('service_unavailable'),
      )
      .finally(() => setLoading(false))
  }, [challengeId])

  const breezy = data?.metrics?.breezy

  const transparency = (
    breezy?.transparency ??
    data?.breezy?.transparency ??
    null
  ) as BreezyTransparency | null

  const tradeCards = useMemo(() => {
    const cards =
      (transparency?.trade_cards ??
        []) as BreezyTradeCard[]

    return [...cards].sort(
      (left, right) =>
        Number(right.closed_at_ms ?? 0) -
        Number(left.closed_at_ms ?? 0),
    )
  }, [transparency])

  const healthyDayCount = (
    transparency?.healthy_days ?? []
  ).filter((day) => day.healthy).length

  const scoreBreakdown =
    transparency?.score_breakdown

  const components =
    (breezy?.risk_components as Record<
      string,
      unknown
    >) ?? null

  const behaviorPenalties =
    (components?.behavior_penalties as Record<
      string,
      number
    >) ?? {}

  const totalPages = Math.max(
    1,
    Math.ceil(
      tradeCards.length / ITEMS_PER_PAGE,
    ),
  )

  const pagedTrades = tradeCards.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  )

  if (loading) {
    return (
      <div className="mobile-breezy-analytics-page">
        <div className="mobile-breezy-analytics-loading">
          Loading Breezy Analytics...
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mobile-breezy-analytics-page">
        <div className="mobile-breezy-analytics-shell">
          {error ===
          'service_unavailable' ? (
            <ServiceUnavailableState
              onRetry={() =>
                window.location.reload()
              }
            />
          ) : (
            <div>{error}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-breezy-analytics-page">
      <div className="mobile-breezy-analytics-shell">

        <header className="mobile-breezy-analytics-header">

          <button
            type="button"
            className="mobile-breezy-analytics-header__icon"
            onClick={() =>
              window.history.back()
            }
          >
            <i className="fas fa-arrow-left" />
          </button>

          <div className="mobile-breezy-analytics-header__text">
            <h1>Breezy Insights</h1>

            <p>
              {data.mt5_account ??
                data.challenge_id}{' '}
              · Behaviour insights
            </p>
          </div>

          <button
            type="button"
            className="mobile-breezy-analytics-header__icon"
            onClick={() =>
              navigate('/support')
            }
          >
            <i className="fas fa-headset" />
          </button>

        </header>

        <section className="mobile-breezy-section mobile-breezy-overview-card">

          <div className="mobile-breezy-section-heading">
            <h2>Overview</h2>
          </div>

          <div className="mobile-breezy-overview-grid">

            <div>
              <span>Current Score</span>

              <strong>
                {breezy?.risk_score ??
                  data.breezy?.risk_score ??
                  0}
              </strong>
            </div>

            <div>
              <span>Band</span>

              <strong>
                {breezy?.risk_score_band ??
                  data.breezy
                    ?.risk_score_band ??
                  'N/A'}
              </strong>
            </div>

            <div>
              <span>Profit Split</span>

              <strong>
                {breezy?.effective_profit_split_percent ??
                  data.breezy
                    ?.profit_split_percent ??
                  0}
                %
              </strong>
            </div>

            <div>
              <span>Healthy Days</span>

              <strong>
                {healthyDayCount}
              </strong>
            </div>

          </div>

        </section>

        <section className="mobile-breezy-section">

          <div className="mobile-breezy-section-heading">
            <h2>Behaviour Insight</h2>
          </div>

          <div className="mobile-breezy-insights-grid">

            <div className="mobile-breezy-panel-item">
              <span>
                Rapid Entries
              </span>

              <strong
                className={toneClass(
                  Number(
                    behaviorPenalties.rapid_same_pair_entries ??
                      0,
                  ),
                )}
              >
                {behaviorPenalties.rapid_same_pair_entries ??
                  0}
              </strong>
            </div>

            <div className="mobile-breezy-panel-item">
              <span>
                Fast Closures
              </span>

              <strong
                className={toneClass(
                  Number(
                    behaviorPenalties.repeated_fast_closures ??
                      0,
                  ),
                )}
              >
                {behaviorPenalties.repeated_fast_closures ??
                  0}
              </strong>
            </div>

            <div className="mobile-breezy-panel-item">
              <span>
                Lot Consistency
              </span>

              <strong
                className={toneClass(
                  Number(
                    behaviorPenalties.inconsistent_lot_sizing ??
                      0,
                  ),
                )}
              >
                {behaviorPenalties.inconsistent_lot_sizing ??
                  0}
              </strong>
            </div>

          </div>

        </section>

        <section className="mobile-breezy-section">

          <div className="mobile-breezy-section-head">

            <div>
              <h2>
                Trade Evaluations
              </h2>

              <p>
                Per-trade score cards
              </p>
            </div>

            <div className="mobile-breezy-pagination">

              <button
                disabled={page === 1}
                onClick={() =>
                  setPage((current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                  )
                }
              >
                Prev
              </button>

              <span>
                {page}/{totalPages}
              </span>

              <button
                disabled={
                  page === totalPages
                }
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      totalPages,
                      current + 1,
                    ),
                  )
                }
              >
                Next
              </button>

            </div>

          </div>

          <div className="mobile-breezy-trades">

            {pagedTrades.map(
              (trade, index) => (
                <article
                  key={`${trade.deal_id ?? trade.position_id ?? index}`}
                  className="mobile-breezy-trade-card"
                >

                  <div className="mobile-breezy-trade-card__inline">

                    <div className="mobile-breezy-trade-card__identity">

                      <h3>
                        {trade.symbol ??
                          'Trade'}
                      </h3>

                      <p>
                        {trade.volume ??
                          0}{' '}
                        lot
                      </p>

                    </div>

                    <div className="mobile-breezy-trade-card__right">

                      <strong
                        className={`mobile-breezy-trade-card__score-value ${toneClass(
                          Number(
                            trade.final_trade_delta ??
                              0,
                          ),
                        )}`}
                      >
                        {Number(
                          trade.final_trade_delta ??
                            0,
                        ) > 0
                          ? '+'
                          : ''}

                        {Number(
                          trade.final_trade_delta ??
                            0,
                        ).toFixed(1)}
                      </strong>

                      <span className="mobile-breezy-trade-card__time">
                        {new Date(
                          trade.closed_at_ms ??
                            0,
                        ).toLocaleString(
                          [],
                          {
                            month:
                              'short',
                            day: 'numeric',
                            hour:
                              '2-digit',
                            minute:
                              '2-digit',
                          },
                        )}
                      </span>

                    </div>

                  </div>

                </article>
              ),
            )}

          </div>

        </section>

      </div>
    </div>
  )
}

export default MobileBreezyAnalyticsPage