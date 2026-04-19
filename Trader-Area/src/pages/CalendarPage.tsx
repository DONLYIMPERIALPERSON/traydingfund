import React, { useEffect, useMemo, useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import {
  fetchUserChallengeAccounts,
  fetchUserChallengeCalendar,
  type UserChallengeAccountListItem,
  type UserChallengeCalendarDay,
} from '../lib/traderAuth'

type DailyPnlStatus = 'neutral' | 'loss' | 'profit'

type CalendarDay = {
  date: Date
  dayNumber: number
  pnl: number | null
  status: DailyPnlStatus
  isCurrentMonth: boolean
}

const brandPrimary = '#008ea4'
const brandGold = '#FFD700'

const formatCurrency = (value: number | null, currency = 'USD') => {
  if (value === null) return 'No trade'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

const buildCalendarDays = (
  selectedAccount: UserChallengeAccountListItem | null,
  calendarEntries: UserChallengeCalendarDay[],
): CalendarDay[] => {
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
    days.push({
      date: prevDate,
      dayNumber: prevDate.getDate(),
      pnl: null,
      status: 'neutral',
      isCurrentMonth: false,
    })
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
      status,
      isCurrentMonth: true,
    })
  }

  while (days.length % 7 !== 0) {
    const nextDate = new Date(year, month, totalDays + (days.length % 7) + 1)
    days.push({
      date: nextDate,
      dayNumber: nextDate.getDate(),
      pnl: null,
      status: 'neutral',
      isCurrentMonth: false,
    })
  }

  return days
}

const getStatusStyles = (status: DailyPnlStatus, isCurrentMonth: boolean) => {
  if (!isCurrentMonth) {
    return {
      background: 'linear-gradient(180deg, rgba(255,255,255,0.5), rgba(244,247,249,0.5))',
      border: '1px solid rgba(205, 214, 224, 0.6)',
      boxShadow: 'none',
    }
  }

  if (status === 'profit') {
    return {
      background: 'linear-gradient(180deg, rgba(12, 179, 98, 0.18), rgba(12, 179, 98, 0.08))',
      border: '1px solid rgba(12, 179, 98, 0.35)',
      boxShadow: '0 8px 20px rgba(12, 179, 98, 0.12)',
    }
  }

  if (status === 'loss') {
    return {
      background: 'linear-gradient(180deg, rgba(220, 53, 69, 0.17), rgba(220, 53, 69, 0.08))',
      border: '1px solid rgba(220, 53, 69, 0.3)',
      boxShadow: '0 8px 20px rgba(220, 53, 69, 0.1)',
    }
  }

  return {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.97), rgba(248,249,250,0.94))',
    border: '1px solid rgba(224,224,224,0.95)',
    boxShadow: '0 8px 18px rgba(0,0,0,0.04)',
  }
}

const CalendarPage: React.FC = () => {
  const [accounts, setAccounts] = useState<UserChallengeAccountListItem[]>([])
  const [selectedChallengeId, setSelectedChallengeId] = useState('')
  const [calendarEntries, setCalendarEntries] = useState<UserChallengeCalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.challenge_id === selectedChallengeId) ?? accounts[0] ?? null,
    [accounts, selectedChallengeId],
  )

  const calendarDays = useMemo(
    () => buildCalendarDays(selectedAccount, calendarEntries),
    [selectedAccount, calendarEntries],
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
        const firstAccount = allAccounts[0]
        if (firstAccount) {
          setSelectedChallengeId((current) => current || firstAccount.challenge_id)
        }
      })
      .catch(() => {
        setError('service_unavailable')
      })
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
      .then((response) => {
        setCalendarEntries(response.daily_pnl ?? [])
      })
      .catch(() => {
        setCalendarEntries([])
      })
  }, [selectedAccount?.challenge_id])

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <style>{`
        @media (max-width: 1024px) {
          .calendar-page-content {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 84px 16px 24px !important;
          }
        }

        @media (max-width: 768px) {
          .calendar-page-content {
            padding: 80px 12px 20px !important;
          }

          .calendar-hero-top-row {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 12px !important;
          }

          .calendar-hero-brand-wrap {
            margin-bottom: 10px !important;
          }

          .calendar-hero-title {
            font-size: 24px !important;
            margin: 0 !important;
          }

          .calendar-hero-month {
            margin-left: auto !important;
            flex: 0 0 auto !important;
          }

          .calendar-hero-card,
          .calendar-main-card {
            border-radius: 18px !important;
            padding: 18px !important;
          }

          .calendar-grid-scroll {
            overflow-x: auto;
            padding-bottom: 6px;
          }

          .calendar-grid {
            min-width: 100%;
            gap: 6px !important;
          }

          .calendar-weekday {
            padding: 4px 2px !important;
            font-size: 11px !important;
            letter-spacing: 0.2px !important;
          }

          .calendar-day-card {
            min-height: 78px !important;
            padding: 8px !important;
            border-radius: 12px !important;
          }

          .calendar-day-number {
            font-size: 13px !important;
          }

          .calendar-day-status-label {
            font-size: 9px !important;
            margin-bottom: 4px !important;
            letter-spacing: 0.2px !important;
          }

          .calendar-day-pnl {
            font-size: 12px !important;
            line-height: 1.15 !important;
            word-break: break-word;
          }

          .calendar-day-footer {
            display: none !important;
          }

          .calendar-main-card {
            padding: 14px !important;
          }

          .calendar-main-card-header {
            margin-bottom: 12px !important;
            gap: 8px !important;
          }

          .calendar-main-card-title {
            font-size: 18px !important;
          }

          .calendar-main-card-subtitle {
            font-size: 12px !important;
            margin: 4px 0 0 0 !important;
          }

          .calendar-legend {
            gap: 6px !important;
          }

          .calendar-legend-item {
            gap: 6px !important;
            padding: 6px 8px !important;
            font-size: 11px !important;
          }

          .calendar-hero-stats {
            flex-wrap: nowrap !important;
            overflow-x: auto;
            padding-bottom: 4px;
            width: 100%;
          }

          .calendar-hero-stat {
            flex: 0 0 auto;
          }

          .calendar-hero-stat--compact {
            min-width: 104px;
          }

          .calendar-hero-stat--wide {
            min-width: 148px;
          }
        }
      `}</style>
      <DesktopHeader />
      <DesktopSidebar />

      <div className="calendar-page-content home-desktop-content" style={{ marginLeft: '280px', padding: '24px', paddingTop: '84px', minHeight: '100vh' }}>
        <div className="calendar-hero-card" style={{
          background: 'linear-gradient(135deg, rgba(0,142,164,0.98), rgba(10,41,52,0.98))',
          borderRadius: '24px',
          padding: '28px',
          position: 'sticky',
          top: '84px',
          zIndex: 10,
          overflow: 'hidden',
          marginBottom: '24px',
          boxShadow: '0 20px 45px rgba(3, 34, 43, 0.18)',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(255,215,0,0.22), transparent 30%)' }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <div className="calendar-hero-top-row">
                <div>
                  <div className="calendar-hero-brand-wrap" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <img src="/logo.webp" alt="MacheFunded" style={{ width: '42px', height: '42px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.22)' }} />
                    <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '0.4px' }}>
                      <span style={{ color: '#ffffff' }}>MACHE</span>
                      <span style={{ color: '#ffffff' }}>FUNDED</span>
                    </div>
                  </div>
                  <h1 className="calendar-hero-title" style={{ color: '#fff', fontSize: '30px', margin: '0 0 8px 0' }}>Trading Calendar</h1>
                </div>
                <div className="calendar-hero-stat calendar-hero-month calendar-hero-stat--compact" style={{ padding: '8px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', alignSelf: 'flex-start' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.45px', color: 'rgba(255,255,255,0.7)', marginBottom: '3px', fontWeight: 700 }}>
                    Month
                  </div>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap' }}>{currentMonthLabel}</div>
                </div>
              </div>

              <div className="calendar-hero-stats" style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px', marginTop: '6px', alignItems: 'stretch' }}>
                <div className="calendar-hero-stat calendar-hero-stat--compact" style={{ padding: '8px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.45px', color: 'rgba(255,255,255,0.7)', marginBottom: '3px', fontWeight: 700 }}>
                    Profitable Days
                  </div>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap' }}>{summary.profitDays}</div>
                </div>
                <div className="calendar-hero-stat calendar-hero-stat--compact" style={{ padding: '8px 10px', borderRadius: '12px', background: 'rgba(220,53,69,0.16)', border: '1px solid rgba(220,53,69,0.28)' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.45px', color: 'rgba(255,255,255,0.7)', marginBottom: '3px', fontWeight: 700 }}>
                    Loss Days
                  </div>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap' }}>{summary.lossDays}</div>
                </div>
                <div className="calendar-hero-stat calendar-hero-stat--wide" style={{ padding: '8px 10px', borderRadius: '12px', background: 'rgba(255,215,0,0.14)', border: '1px solid rgba(255,215,0,0.24)' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.45px', color: 'rgba(255,255,255,0.7)', marginBottom: '3px', fontWeight: 700 }}>
                    Total PnL
                  </div>
                  <div style={{ color: brandGold, fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {formatCurrency(summary.totalPnl, selectedAccount?.currency ?? 'USD')}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ minWidth: '280px', maxWidth: '360px', width: '100%' }}>
              <label htmlFor="calendar-account" style={{ display: 'block', color: '#fff', fontWeight: 600, fontSize: '13px', marginBottom: '8px', letterSpacing: '0.3px' }}>
                Select Active Account
              </label>
              <select
                id="calendar-account"
                value={selectedAccount?.challenge_id ?? ''}
                onChange={(event) => setSelectedChallengeId(event.target.value)}
                style={{
                  width: '100%',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.14)',
                  color: '#fff',
                  padding: '14px 16px',
                  fontSize: '14px',
                  outline: 'none',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {accounts.map((account) => (
                  <option key={account.challenge_id} value={account.challenge_id} style={{ color: '#111' }}>
                    {(account.mt5_account ?? account.challenge_id)} • {account.account_size} {account.currency ?? 'USD'} • {account.phase}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', border: '1px solid #e6eaef' }}>Loading calendar...</div>
        ) : error ? (
          <ServiceUnavailableState
            title="We’re experiencing a temporary issue on our side."
            message="Your trading calendar is temporarily unavailable because our service is not responding as expected. Please try again shortly — our team is already working to restore everything as quickly as possible."
            onRetry={loadCalendarAccounts}
          />
        ) : !selectedAccount ? (
          <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', border: '1px solid #e6eaef' }}>
            No account available yet. Start a challenge to see your trading calendar.
          </div>
        ) : (
          <>
            <div className="calendar-main-card" style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e7edf3', boxShadow: '0 18px 35px rgba(15,23,42,0.06)' }}>
              <div className="calendar-main-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 className="calendar-main-card-title" style={{ margin: 0, fontSize: '24px', color: '#111827' }}>{currentMonthLabel}</h2>
                  <p className="calendar-main-card-subtitle" style={{ margin: '6px 0 0 0', color: '#6b7280' }}>
                    {(selectedAccount.mt5_account ?? selectedAccount.challenge_id)} • {selectedAccount.account_size} {selectedAccount.currency ?? 'USD'}
                  </p>
                </div>

                <div className="calendar-legend" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'No trade', color: '#ffffff', border: '#d9dee5' },
                    { label: 'Loss day', color: 'rgba(220, 53, 69, 0.2)', border: 'rgba(220, 53, 69, 0.45)' },
                    { label: 'Profit day', color: 'rgba(12, 179, 98, 0.22)', border: 'rgba(12, 179, 98, 0.4)' },
                  ].map((legend) => (
                    <div className="calendar-legend-item" key={legend.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '999px', background: '#f8fafc', border: '1px solid #edf2f7', color: '#4b5563', fontSize: '13px', fontWeight: 600 }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '999px', background: legend.color, border: `1px solid ${legend.border}` }} />
                      {legend.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="calendar-grid-scroll">
                <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '12px' }}>
                {weekDays.map((day) => (
                  <div className="calendar-weekday" key={day} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: brandPrimary, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    {day}
                  </div>
                ))}

                {calendarDays.map((day) => {
                  const styles = getStatusStyles(day.status, day.isCurrentMonth)
                  return (
                    <div
                      className="calendar-day-card"
                      key={day.date.toISOString()}
                      style={{
                        minHeight: '120px',
                        borderRadius: '18px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        ...styles,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="calendar-day-number" style={{ fontSize: '16px', fontWeight: 800, color: day.isCurrentMonth ? '#111827' : '#9ca3af' }}>{day.dayNumber}</span>
                        {day.isCurrentMonth && (
                          <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '999px',
                            backgroundColor: day.status === 'profit' ? '#0cb362' : day.status === 'loss' ? '#dc3545' : brandGold,
                            boxShadow: `0 0 0 4px ${day.status === 'profit' ? 'rgba(12,179,98,0.12)' : day.status === 'loss' ? 'rgba(220,53,69,0.1)' : 'rgba(255,215,0,0.12)'}`,
                          }} />
                        )}
                      </div>

                      <div>
                        <div className="calendar-day-status-label" style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          {day.isCurrentMonth ? (day.status === 'profit' ? 'Profit' : day.status === 'loss' ? 'Loss' : 'No trade') : 'Out'}
                        </div>
                        <div className="calendar-day-pnl" style={{
                          fontSize: '18px',
                          fontWeight: 800,
                          color: day.status === 'profit' ? '#0a8f4f' : day.status === 'loss' ? '#c12d3d' : '#1f2937',
                          lineHeight: 1.3,
                        }}>
                          {day.isCurrentMonth ? formatCurrency(day.pnl, selectedAccount.currency ?? 'USD') : '—'}
                        </div>
                      </div>

                      <div className="calendar-day-footer" style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>MacheFunded</div>
                        <div style={{ width: '42px', height: '4px', borderRadius: '999px', background: `linear-gradient(90deg, ${brandPrimary}, ${brandGold})` }} />
                      </div>
                    </div>
                  )
                })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <DesktopFooter />
    </div>
  )
}

export default CalendarPage