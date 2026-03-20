import { supabase } from './supabaseClient'

const baseUrl = import.meta.env.VITE_API_BASE_URL as string

const getAccessToken = async () => {
  const stored = localStorage.getItem('supabase_access_token')
  if (stored) {
    return stored
  }

  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) {
    localStorage.setItem('supabase_access_token', data.session.access_token)
    return data.session.access_token
  }

  return null
}

const refreshSession = async () => {
  const { data, error } = await supabase.auth.refreshSession()
  if (error) {
    return null
  }
  if (data.session?.access_token) {
    localStorage.setItem('supabase_access_token', data.session.access_token)
    return data.session.access_token
  }
  return null
}

const shouldRefresh = (response: Response, bodyText?: string) => {
  if (response.status === 401) return true
  if (response.status === 403 && bodyText && bodyText.toLowerCase().includes('token')) return true
  if (bodyText && bodyText.toLowerCase().includes('jwt')) return true
  if (bodyText && bodyText.toLowerCase().includes('expired')) return true
  return false
}

const handleExpiredSession = async () => {
  localStorage.removeItem('supabase_access_token')
  await supabase.auth.signOut()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const affiliateId = localStorage.getItem('affiliate_referrer_id')

  const performFetch = async (accessToken?: string | null) =>
    fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(affiliateId ? { 'x-affiliate-id': affiliateId } : {}),
        ...(init.headers ?? {}),
      },
    })

  let response = await performFetch(token)
  let responseText: string | undefined

  if (!response.ok) {
    responseText = await response.clone().text()
  }

  if (responseText && shouldRefresh(response, responseText)) {
    const refreshedToken = await refreshSession()
    if (refreshedToken) {
      response = await performFetch(refreshedToken)
    } else {
      await handleExpiredSession()
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (!response.ok) {
    const text = responseText ?? await response.text()
    if (text.toLowerCase().includes('exp') && text.toLowerCase().includes('timestamp')) {
      await handleExpiredSession()
      throw new Error('Session expired. Please log in again.')
    }
    throw new Error(text || 'Request failed')
  }

  return response.json() as Promise<T>
}