import { getSessionToken } from '@descope/react-sdk'

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:5500'

export type AuthMeResponse = {
  id: number
  descope_user_id: string
  email: string
  full_name: string | null
  role: string
  status: string
}

export async function fetchCurrentUser(sessionToken?: string): Promise<AuthMeResponse> {
  const token = sessionToken || getSessionToken()
  if (!token) {
    throw new Error('No Descope session token available')
  }

  const response = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Backend auth failed: ${response.status} ${errorText}`)
  }

  return response.json() as Promise<AuthMeResponse>
}

export async function loginWithBackend(sessionToken?: string): Promise<AuthMeResponse> {
  const token = sessionToken || getSessionToken()
  if (!token) {
    throw new Error('No Descope session token available')
  }

  const response = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Backend login failed: ${response.status} ${errorText}`)
  }

  return response.json() as Promise<AuthMeResponse>
}

export async function logoutFromBackend(sessionToken?: string): Promise<void> {
  const token = sessionToken || getSessionToken()
  if (!token) {
    return
  }

  await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function persistAuthUser(user: AuthMeResponse): void {
  localStorage.setItem('nairatrader_auth_user', JSON.stringify(user))
}

export function clearPersistedAuthUser(): void {
  localStorage.removeItem('nairatrader_auth_user')
}
