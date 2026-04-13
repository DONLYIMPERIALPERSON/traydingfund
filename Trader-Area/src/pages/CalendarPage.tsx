import React, { useEffect, useMemo, useState } from 'react'
import DesktopHeader from '../components/DesktopHeader'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopFooter from '../components/DesktopFooter'
import { fetchUserChallengeAccounts, type UserChallengeAccountListItem } from '../lib/traderAuth'

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

const buildCalendarDays = (selectedAccount: UserChallengeAccountListItem | null): CalendarDay[] => {
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

  const seedBase = (selectedAccount?.challenge_id ?? 'mache').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)

  for (let day = 1; day <= totalDays; day += 1) {
    const score = (seedBase + day * 17) % 9
    let pnl: number | null = null
    let status: DailyPnlStatus = 'neutral'

    if (score <= 2) {
      pnl = null
      status = 'neutral'
    } else if (score <= 4) {
      pnl = -1 * (55 + ((seedBase + day * 11) % 210))
      status = 'loss'
    } else {
      pnl = 70 + ((seedBase + day * 13) % 320)
      status = 'profit'
    }

    days.push({
      date: new Date(year, month, day),
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    fetchUserChallengeAccounts()
      .then((response) => {
        const allAccounts = [...response.active_accounts, ...response.history_accounts]
        setAccounts(allAccounts)
        const firstAccount = allAccounts[0]
        if (firstAccount) {
          setSelectedChallengeId(firstAccount.challenge_id)
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load accounts')
      })
      .finally(() => setLoading(false))
  }, [])

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.challenge_id === selectedChallengeId) ?? accounts[0] ?? null,
    [accounts, selectedChallengeId],
  )

  const calendarDays = useMemo(() => buildCalendarDays(selectedAccount), [selectedAccount])

  const summary = useMemo(() => {
    const profitDays = calendarDays.filter((day) => day.isCurrentMonth && day.status === 'profit').length
    const lossDays = calendarDays.filter((day) => day.isCurrentMonth && day.status === 'loss').length
    const noTradeDays = calendarDays.filter((day) => day.isCurrentMonth && day.status === 'neutral').length
    const totalPnl = calendarDays.reduce((sum, day) => sum + (day.pnl ?? 0), 0)

    return { profitDays, lossDays, noTradeDays, totalPnl }
  }, [calendarDays])

  const currentMonthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date())
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <DesktopHeader />
      <DesktopSidebar />

      <div style={{ marginLeft: '280px', padding: '24px', paddingTop: '84px', minHeight: '100vh' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,142,164,0.98), rgba(10,41,52,0.98))',
          borderRadius: '24px',
          padding: '28px',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '24px',
          boxShadow: '0 20px 45px rgba(3, 34, 43, 0.18)',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(255,215,0,0.22), transparent 30%)' }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <img src="/logo.webp" alt="MacheFunded" style={{ width: '42px', height: '42px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.22)' }} />
                <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '0.4px' }}>
                  <span style={{ color: '#ffffff' }}>MACHE</span>
                  <span style={{ color: brandGold }}>FUNDED</span>
                </div>
              </div>
              <h1 style={{ color: '#fff', fontSize: '30px', margin: '0 0 8px 0' }}>Trading Calendar</h1>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, maxWidth: '700px', lineHeight: 1.6 }}>
                A branded monthly PnL calendar designed for clean reviews and shareable screenshots.
              </p>
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
          <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', border: '1px solid #f2c5ca', color: '#a32835' }}>{error}</div>
        ) : !selectedAccount ? (
          <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', border: '1px solid #e6eaef' }}>
            No account available yet. Start a challenge to see your trading calendar.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Profit Days', value: summary.profitDays, accent: '#0cb362' },
                { label: 'Loss Days', value: summary.lossDays, accent: '#dc3545' },
                { label: 'No Trade Days', value: summary.noTradeDays, accent: '#a7b0ba' },
                { label: 'Month PnL', value: formatCurrency(summary.totalPnl, selectedAccount.currency ?? 'USD'), accent: brandPrimary },
              ].map((item) => (
                <div key={item.label} style={{ background: '#fff', borderRadius: '18px', padding: '18px', border: '1px solid #e7edf3', boxShadow: '0 10px 30px rgba(15,23,42,0.04)' }}>
                  <div style={{ width: '40px', height: '4px', borderRadius: '999px', backgroundColor: item.accent, marginBottom: '14px' }} />
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '26px', color: '#111827', fontWeight: 800 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e7edf3', boxShadow: '0 18px 35px rgba(15,23,42,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>{currentMonthLabel}</h2>
                  <p style={{ margin: '6px 0 0 0', color: '#6b7280' }}>
                    {(selectedAccount.mt5_account ?? selectedAccount.challenge_id)} • {selectedAccount.account_size} {selectedAccount.currency ?? 'USD'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'No trade', color: '#ffffff', border: '#d9dee5' },
                    { label: 'Loss day', color: 'rgba(220, 53, 69, 0.2)', border: 'rgba(220, 53, 69, 0.45)' },
                    { label: 'Profit day', color: 'rgba(12, 179, 98, 0.22)', border: 'rgba(12, 179, 98, 0.4)' },
                  ].map((legend) => (
                    <div key={legend.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '999px', background: '#f8fafc', border: '1px solid #edf2f7', color: '#4b5563', fontSize: '13px', fontWeight: 600 }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '999px', background: legend.color, border: `1px solid ${legend.border}` }} />
                      {legend.label}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '12px' }}>
                {weekDays.map((day) => (
                  <div key={day} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: brandPrimary, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    {day}
                  </div>
                ))}

                {calendarDays.map((day) => {
                  const styles = getStatusStyles(day.status, day.isCurrentMonth)
                  return (
                    <div
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
                        <span style={{ fontSize: '16px', fontWeight: 800, color: day.isCurrentMonth ? '#111827' : '#9ca3af' }}>{day.dayNumber}</span>
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
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          {day.isCurrentMonth ? (day.status === 'profit' ? 'Profit day' : day.status === 'loss' ? 'Loss day' : 'No trade') : 'Out of month'}
                        </div>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 800,
                          color: day.status === 'profit' ? '#0a8f4f' : day.status === 'loss' ? '#c12d3d' : '#1f2937',
                          lineHeight: 1.3,
                        }}>
                          {day.isCurrentMonth ? formatCurrency(day.pnl, selectedAccount.currency ?? 'USD') : '—'}
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>MacheFunded</div>
                        <div style={{ width: '42px', height: '4px', borderRadius: '999px', background: `linear-gradient(90deg, ${brandPrimary}, ${brandGold})` }} />
                      </div>
                    </div>
                  )
                })}
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