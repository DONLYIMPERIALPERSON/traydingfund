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

  let response: Response
  try {
    response = await performFetch(token)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.toLowerCase().includes('failed to fetch')) {
      throw new Error('Network error. Please check your connection or server availability and try again.')
    }
    throw new Error(message || 'Network error. Please try again.')
  }
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
    const normalizedText = text.trim()
    if (normalizedText.toLowerCase().includes('exp') && normalizedText.toLowerCase().includes('timestamp')) {
      await handleExpiredSession()
      throw new Error('Session expired. Please log in again.')
    }
    if (response.status === 413 || normalizedText.toLowerCase().includes('request entity too large')) {
      throw new Error('Upload failed: file too large. Please reduce the file size and try again.')
    }
    let message = normalizedText || `Request failed (${response.status})`
    try {
      const parsed = JSON.parse(normalizedText) as { message?: string; error?: string; detail?: string }
      message = parsed.message || parsed.error || parsed.detail || message
    } catch {
      // keep message fallback
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}