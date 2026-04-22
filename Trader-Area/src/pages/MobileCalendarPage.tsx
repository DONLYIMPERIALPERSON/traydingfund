import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import {
  fetchUserChallengeAccounts,
  fetchUserChallengeCalendar,
  type UserChallengeAccountListItem,
  type UserChallengeCalendarDay,
} from '../lib/traderAuth'
import '../styles/MobileCalendarPage.css'

type DailyPnlStatus = 'neutral' | 'loss' | 'profit'

type CalendarDay = {
  date: Date
  dayNumber: number
  pnl: number | null
  tradeCount: number | null
  status: DailyPnlStatus
  isCurrentMonth: boolean
}

const formatCurrency = (value: number | null, currency = 'USD') => {
  if (value === null) return 'No trade'
  const normalizedCurrency = currency.toUpperCase()
  if (normalizedCurrency === 'NGN') {
    return `₦${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatCompactPnl = (value: number | null) => {
  if (value === null) return ''
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  if (value > 0) return `+${formatted}`
  if (value < 0) return `-${formatted}`
  return formatted
}

const formatAccountSizeLabel = (accountSize?: string | null, currency = 'USD') => {
  if (!accountSize) return currency.toUpperCase() === 'NGN' ? '₦0' : '$0'
  const numeric = Number(String(accountSize).replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(numeric)) return accountSize
  const normalizedCurrency = currency.toUpperCase()
  const symbol = normalizedCurrency === 'NGN' ? '₦' : '$'
  return `${symbol}${numeric.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

const buildCalendarDays = (calendarEntries: UserChallengeCalendarDay[]): CalendarDay[] => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekDay = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const leadingDays = startWeekDay === 0 ? 6 : startWeekDay - 1
  const days: CalendarDay[] = []

  for (let i = leadingDays; i > 0; i -= 1) {
    const prevDate = new Date(year, month, 1 - i)
    days.push({ date: prevDate, dayNumber: prevDate.getDate(), pnl: null, tradeCount: null, status: 'neutral', isCurrentMonth: false })
  }

  const pnlByDate = new Map(calendarEntries.map((entry) => [entry.date, entry.pnl]))

  for (let day = 1; day <= totalDays; day += 1) {
    const currentDate = new Date(year, month, day)
    const dateKey = currentDate.toISOString().slice(0, 10)
    const pnlValue = pnlByDate.get(dateKey)
    const pnl = typeof pnlValue === 'number' ? pnlValue : null
    const status: DailyPnlStatus = pnl == null ? 'neutral' : pnl < 0 ? 'loss' : 'profit'

    days.push({
      date: currentDate,
      dayNumber: day,
      pnl,
      tradeCount: pnl == null ? null : 1,
      status,
      isCurrentMonth: true,
    })
  }

  while (days.length % 7 !== 0) {
    const nextDate = new Date(year, month, totalDays + (days.length % 7) + 1)
    days.push({ date: nextDate, dayNumber: nextDate.getDate(), pnl: null, tradeCount: null, status: 'neutral', isCurrentMonth: false })
  }

  return days
}

const MobileCalendarPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [accounts, setAccounts] = useState<UserChallengeAccountListItem[]>([])
  const [calendarEntries, setCalendarEntries] = useState<UserChallengeCalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const challengeId = searchParams.get('challenge_id') ?? ''

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.challenge_id === challengeId) ?? null,
    [accounts, challengeId],
  )

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarEntries),
    [calendarEntries],
  )

  const summary = useMemo(() => {
    const profitDays = calendarDays.filter((day) => day.isCurrentMonth && day.status === 'profit').length
    const lossDays = calendarDays.filter((day) => day.isCurrentMonth && day.status === 'loss').length
    const noTradeDays = calendarDays.filter((day) => day.isCurrentMonth && day.status === 'neutral').length
    const totalPnl = calendarDays.reduce((sum, day) => sum + (day.pnl ?? 0), 0)
    return { profitDays, lossDays, noTradeDays, totalPnl }
  }, [calendarDays])

  const currentMonthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date())
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const loadCalendarAccounts = () => {
    setLoading(true)
    setError('')

    fetchUserChallengeAccounts()
      .then((response) => {
        const allAccounts = [...response.active_accounts, ...response.history_accounts]
        setAccounts(allAccounts)
      })
      .catch(() => setError('service_unavailable'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCalendarAccounts()
  }, [])

  useEffect(() => {
    if (!selectedAccount?.challenge_id) {
      setCalendarEntries([])
      return
    }

    fetchUserChallengeCalendar(selectedAccount.challenge_id)
      .then((response) => setCalendarEntries(response.daily_pnl ?? []))
      .catch(() => setCalendarEntries([]))
  }, [selectedAccount?.challenge_id])

  return (
    <div className="mobile-calendar-page">
      <div className="mobile-calendar-shell">
        <header className="mobile-calendar-header">
          <button type="button" className="mobile-calendar-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-calendar-header__text">
            <h1>Calendar</h1>
            <p>{currentMonthLabel}</p>
          </div>
          <button type="button" className="mobile-calendar-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        <section className="mobile-calendar-top-summary">
          <h2>{currentMonthLabel}</h2>
          <strong className={summary.totalPnl >= 0 ? 'is-profit' : 'is-loss'}>
            {summary.totalPnl >= 0 ? '+' : ''}{formatCurrency(summary.totalPnl, selectedAccount?.currency ?? 'USD')}
          </strong>
        </section>

        {loading ? (
          <div className="mobile-calendar-empty">Loading calendar...</div>
        ) : error ? (
          <ServiceUnavailableState
            title="We’re experiencing a temporary issue on our side."
            message="Your trading calendar is temporarily unavailable because our service is not responding as expected. Please try again shortly."
            onRetry={loadCalendarAccounts}
          />
        ) : !challengeId ? (
          <div className="mobile-calendar-empty">No account selected. Open calendar from an account card.</div>
        ) : !selectedAccount ? (
          <div className="mobile-calendar-empty">Selected account could not be found.</div>
        ) : (
          <section className="mobile-calendar-main-content">
            <div className="mobile-calendar-main-card__header">
              <div>
                <p>{(selectedAccount.mt5_account ?? selectedAccount.challenge_id)} • {formatAccountSizeLabel(selectedAccount.account_size, selectedAccount.currency ?? 'USD')} {selectedAccount.currency ?? 'USD'}</p>
              </div>
            </div>

            <div className="mobile-calendar-legend">
              {[
                { label: 'No trade', className: 'neutral' },
                { label: 'Loss day', className: 'loss' },
                { label: 'Profit day', className: 'profit' },
              ].map((legend) => (
                <div key={legend.label} className={`mobile-calendar-legend-item ${legend.className}`}>
                  <span />
                  {legend.label}
                </div>
              ))}
            </div>

            <div className="mobile-calendar-grid-wrap">
              <div className="mobile-calendar-grid">
                {weekDays.map((day) => (
                  <div key={day} className="mobile-calendar-weekday">{day}</div>
                ))}

                {calendarDays.map((day) => (
                  <div key={day.date.toISOString()} className={`mobile-calendar-day-card ${day.status} ${day.isCurrentMonth ? '' : 'out-month'}`}>
                    <div className="mobile-calendar-day-card__top">
                      <span className="mobile-calendar-day-number">{day.dayNumber}</span>
                      {day.isCurrentMonth ? (
                        <div className="mobile-calendar-day-card__top-right">
                          {day.tradeCount ? <span className="mobile-calendar-day-trade-count">{day.tradeCount}</span> : null}
                          <span className="mobile-calendar-day-dot" />
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <div className="mobile-calendar-day-status-label">
                        {day.isCurrentMonth ? (day.status === 'profit' ? 'Profit' : day.status === 'loss' ? 'Loss' : 'No trade') : 'Out'}
                      </div>
                      <div className="mobile-calendar-day-pnl">
                        {day.isCurrentMonth
                          ? day.pnl === null
                            ? ''
                            : formatCompactPnl(day.pnl)
                          : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <section className="mobile-calendar-summary-cards">
              <article className="mobile-calendar-summary-card is-profit">
                <span>Profitable Days</span>
                <strong>{summary.profitDays}</strong>
              </article>
              <article className="mobile-calendar-summary-card is-loss">
                <span>Loss Days</span>
                <strong>{summary.lossDays}</strong>
              </article>
              <article className="mobile-calendar-summary-card is-neutral">
                <span>No Trade Days</span>
                <strong>{summary.noTradeDays}</strong>
              </article>
            </section>
          </section>
        )}
      </div>
    </div>
  )
}

export default MobileCalendarPage