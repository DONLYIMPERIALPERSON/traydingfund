import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ServiceUnavailableState from '../components/ServiceUnavailableState'
import { fetchEconomicCalendar, type EconomicCalendarItem } from '../lib/traderAuth'
import '../styles/MobileEconomicCalendarPage.css'

type ImpactLevel = 'High' | 'Medium' | 'Low'

type CalendarEvent = {
  id: string
  time: string
  currency: string
  title: string
  impact: ImpactLevel
  actual?: string
  forecast?: string
  previous?: string
}

type CalendarDayGroup = {
  id: string
  label: string
  dateText: string
  events: CalendarEvent[]
}

const dateTabs = ['Today', 'Tomorrow', 'This Week'] as const
const impactFilters = ['All', 'High', 'Medium', 'Low'] as const

const formatDayLabel = (date: Date) => {
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const dateKey = date.toDateString()
  if (dateKey === today.toDateString()) return 'Today'
  if (dateKey === tomorrow.toDateString()) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

const formatDayText = (date: Date) =>
  date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

const formatEventTime = (dateString: string) => {
  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) return '--:--'
  return parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const buildCalendarGroups = (items: EconomicCalendarItem[]): CalendarDayGroup[] => {
  const grouped = new Map<string, CalendarDayGroup>()

  items.forEach((item, index) => {
    const parsed = new Date(item.date)
    if (Number.isNaN(parsed.getTime())) return
    const key = parsed.toISOString().slice(0, 10)
    const existing = grouped.get(key)
    const event: CalendarEvent = {
      id: `${key}-${index}`,
      time: formatEventTime(item.date),
      currency: item.country || 'N/A',
      title: item.event,
      impact: item.impact as ImpactLevel,
      actual: item.actual ?? '-',
      forecast: item.forecast ?? '-',
      previous: item.previous ?? '-',
    }

    if (existing) {
      existing.events.push(event)
      return
    }

    grouped.set(key, {
      id: key,
      label: formatDayLabel(parsed),
      dateText: formatDayText(parsed),
      events: [event],
    })
  })

  return Array.from(grouped.values()).sort((a, b) => a.id.localeCompare(b.id))
}

const MobileEconomicCalendarPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeDateTab, setActiveDateTab] = useState<(typeof dateTabs)[number]>('Today')
  const [activeImpactFilter, setActiveImpactFilter] = useState<(typeof impactFilters)[number]>('All')
  const [calendarItems, setCalendarItems] = useState<EconomicCalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadEconomicCalendar = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await fetchEconomicCalendar()
        setCalendarItems(response.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load economic calendar')
      } finally {
        setLoading(false)
      }
    }

    void loadEconomicCalendar()
  }, [])

  const visibleGroups = useMemo(() => {
    const calendarData = buildCalendarGroups(calendarItems)
    const scopedGroups = activeDateTab === 'Today'
      ? calendarData.slice(0, 1)
      : activeDateTab === 'Tomorrow'
        ? calendarData.slice(1, 2)
        : calendarData

    if (activeImpactFilter === 'All') return scopedGroups

    return scopedGroups
      .map((group) => ({
        ...group,
        events: group.events.filter((event) => event.impact === activeImpactFilter),
      }))
      .filter((group) => group.events.length > 0)
  }, [activeDateTab, activeImpactFilter])

  const totalEvents = visibleGroups.reduce((sum, group) => sum + group.events.length, 0)

  return (
    <div className="mobile-economic-calendar-page">
      <div className="mobile-economic-calendar-shell">
        <header className="mobile-economic-calendar-header">
          <button type="button" className="mobile-economic-calendar-header__icon" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" />
          </button>
          <div className="mobile-economic-calendar-header__text">
            <h1>Economic Calendar</h1>
            <p>Market-moving events and macro releases.</p>
          </div>
          <button type="button" className="mobile-economic-calendar-header__icon" onClick={() => navigate('/support')}>
            <i className="fas fa-headset" />
          </button>
        </header>

        <section className="mobile-economic-calendar-hero">
          <div>
            <span className="mobile-economic-calendar-hero__eyebrow">Upcoming Events</span>
            <strong>{totalEvents}</strong>
            <p>Track major macro releases and market-moving news.</p>
          </div>
          <div className="mobile-economic-calendar-hero__badge">
            <i className="fas fa-bolt" />
            Market Pulse
          </div>
        </section>

        <section className="mobile-economic-calendar-controls">
          <div className="mobile-economic-calendar-tabs">
            {dateTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeDateTab === tab ? 'is-active' : ''}
                onClick={() => setActiveDateTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mobile-economic-calendar-filters">
            {impactFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={activeImpactFilter === filter ? 'is-active' : ''}
                onClick={() => setActiveImpactFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="mobile-economic-calendar-empty">Loading economic calendar...</div>
        ) : error ? (
          <ServiceUnavailableState onRetry={() => window.location.reload()} />
        ) : visibleGroups.length === 0 ? (
          <div className="mobile-economic-calendar-empty">
            No events match this filter.
          </div>
        ) : (
          <section className="mobile-economic-calendar-list">
            {visibleGroups.map((group) => (
              <div key={group.id} className="mobile-economic-calendar-group">
                <div className="mobile-economic-calendar-group__header">
                  <div>
                    <strong>{group.label}</strong>
                    <span>{group.dateText}</span>
                  </div>
                  <em>{group.events.length} events</em>
                </div>

                <div className="mobile-economic-calendar-events">
                  {group.events.map((event) => (
                    <article key={event.id} className="mobile-economic-calendar-event-card">
                      <div className="mobile-economic-calendar-event-card__top">
                        <div className="mobile-economic-calendar-event-card__content">
                          <div className="mobile-economic-calendar-event-card__title-row">
                            <div className="mobile-economic-calendar-event-card__meta-inline">
                              <span>{event.time}</span>
                              <strong>{event.currency}</strong>
                            </div>
                            <div className="mobile-economic-calendar-event-card__headline-inline">
                            <strong>{event.title}</strong>
                            <span className={`impact-${event.impact.toLowerCase()}`}>{event.impact}</span>
                            </div>
                          </div>

                          <div className="mobile-economic-calendar-event-card__metrics">
                            <span><label>Actual</label>{event.actual ?? '-'}</span>
                            <span><label>Forecast</label>{event.forecast ?? '-'}</span>
                            <span><label>Previous</label>{event.previous ?? '-'}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

export default MobileEconomicCalendarPage