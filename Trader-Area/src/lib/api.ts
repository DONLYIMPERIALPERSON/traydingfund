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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()

  const performFetch = async (accessToken?: string | null) =>
    fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init.headers ?? {}),
      },
    })

  let response = await performFetch(token)

  if (response.status === 401) {
    const refreshedToken = await refreshSession()
    if (refreshedToken) {
      response = await performFetch(refreshedToken)
    }
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Request failed')
  }

  return response.json() as Promise<T>
}