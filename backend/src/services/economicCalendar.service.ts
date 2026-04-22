import { buildCacheKey, getCached, setCached } from '../common/cache'
import { env } from '../config/env'

export type EconomicCalendarImpact = 'High' | 'Medium' | 'Low' | string

export type EconomicCalendarItem = {
  event: string
  country: string
  date: string
  impact: EconomicCalendarImpact
  actual: string | null
  forecast: string | null
  previous: string | null
}

const CACHE_KEY = buildCacheKey(['economic-calendar', 'rapidapi'])
const CACHE_DURATION_SECONDS = 5 * 60
const RAPID_API_HOST = 'economic-calendar-api-tradingeconomics.p.rapidapi.com'

let inMemoryCache: EconomicCalendarItem[] = []
let lastFetchTime = 0

const normalizeValue = (value: unknown) => {
  if (value == null) return null
  const text = String(value).trim()
  return text.length ? text : null
}

const normalizeImpact = (value: unknown): EconomicCalendarImpact => {
  const text = String(value ?? '').trim()
  if (!text) return 'Low'
  const lower = text.toLowerCase()
  if (lower === 'high') return 'High'
  if (lower === 'medium') return 'Medium'
  if (lower === 'low') return 'Low'
  return text
}

const cleanEconomicCalendar = (payload: unknown): EconomicCalendarItem[] => {
  if (!Array.isArray(payload)) return []

  return payload
    .map((event) => {
      const item = event as Record<string, unknown>
      return {
        event: String(item.event ?? '').trim(),
        country: String(item.country ?? '').trim(),
        date: String(item.date ?? '').trim(),
        impact: normalizeImpact(item.impact),
        actual: normalizeValue(item.actual),
        forecast: normalizeValue(item.forecast),
        previous: normalizeValue(item.previous),
      }
    })
    .filter((event) => event.event && event.country && event.date)
}

const readCachedFallback = async () => {
  const redisCached = await getCached<EconomicCalendarItem[]>(CACHE_KEY)
  if (redisCached?.length) {
    inMemoryCache = redisCached
    return redisCached
  }
  return inMemoryCache
}

export const fetchEconomicCalendar = async (): Promise<EconomicCalendarItem[]> => {
  const now = Date.now()

  if (now - lastFetchTime < CACHE_DURATION_SECONDS * 1000 && inMemoryCache.length > 0) {
    return inMemoryCache
  }

  const redisCached = await getCached<EconomicCalendarItem[]>(CACHE_KEY)
  if (redisCached?.length && now - lastFetchTime < CACHE_DURATION_SECONDS * 1000) {
    inMemoryCache = redisCached
    return redisCached
  }

  if (!env.rapidApiKey) {
    return readCachedFallback()
  }

  try {
    const url = new URL(`https://${RAPID_API_HOST}/calendar`)
    url.searchParams.set('impact', 'High')
    url.searchParams.set('holidays', 'false')
    url.searchParams.set('resolved', 'false')
    url.searchParams.set('fields', 'id,date,eventName,impactLabel,actual,forecast,previous,country,event')
    url.searchParams.set('descriptions', 'false')
    url.searchParams.set('c', 'guest:guest')

    const optimizedResponse = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': env.rapidApiKey,
        'X-RapidAPI-Host': RAPID_API_HOST,
      },
      method: 'GET',
    })

    if (!optimizedResponse.ok) {
      throw new Error(`RapidAPI request failed (${optimizedResponse.status})`)
    }

    const payload = await optimizedResponse.json() as { events?: unknown[] } | unknown[]
    const rawEvents = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { events?: unknown[] }).events)
        ? (payload as { events?: unknown[] }).events ?? []
        : []

    const cleaned = cleanEconomicCalendar(
      rawEvents.map((event) => ({
            event: (event as Record<string, unknown>).eventName ?? (event as Record<string, unknown>).Event ?? (event as Record<string, unknown>).event,
            country: (event as Record<string, unknown>).country ?? (event as Record<string, unknown>).Country,
            date: (event as Record<string, unknown>).date ?? (event as Record<string, unknown>).Date,
            impact: (() => {
              const rawImportance = (event as Record<string, unknown>).impactLabel ?? (event as Record<string, unknown>).Importance
              if (rawImportance === 3 || rawImportance === '3') return 'High'
              if (rawImportance === 2 || rawImportance === '2') return 'Medium'
              if (rawImportance === 1 || rawImportance === '1') return 'Low'
              return rawImportance
            })(),
            actual: (event as Record<string, unknown>).actual ?? (event as Record<string, unknown>).Actual,
            forecast: (event as Record<string, unknown>).forecast ?? (event as Record<string, unknown>).Forecast,
            previous: (event as Record<string, unknown>).previous ?? (event as Record<string, unknown>).Previous,
          })),
    )

    if (cleaned.length > 0) {
      inMemoryCache = cleaned
      lastFetchTime = now
      await setCached(CACHE_KEY, cleaned, CACHE_DURATION_SECONDS)
    }

    return cleaned
  } catch (error) {
    console.error('[economic-calendar] fetch failed:', error)
    return readCachedFallback()
  }
}

export const filterEconomicCalendarByImpact = (
  items: EconomicCalendarItem[],
  impact?: string,
) => {
  if (!impact || impact.toLowerCase() === 'all') return items
  return items.filter((item) => String(item.impact).toLowerCase() === impact.toLowerCase())
}

export const warmEconomicCalendarCache = async () => {
  await fetchEconomicCalendar()
}