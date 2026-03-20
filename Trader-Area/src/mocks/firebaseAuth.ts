import type { User } from './firebase'
import { apiFetch } from '../lib/api'

export type AuthMeResponse = {
  id: number
  firebase_uid: string
  email: string
  full_name: string | null
  first_name?: string | null
  last_name?: string | null
  nick_name?: string | null
  use_nickname_for_certificates?: boolean
  role: string
  status: string
  kyc_status?: string | null
}

const mockUser: AuthMeResponse = {
  id: 101,
  firebase_uid: 'mock-firebase-uid',
  email: 'trader@machefunded.com',
  full_name: 'Alex Trader',
  nick_name: 'ProTrader',
  role: 'trader',
  status: 'active',
  kyc_status: 'verified',
  use_nickname_for_certificates: true,
}

export async function checkEmailRegistration(_email: string): Promise<boolean> {
  return true
}

export async function signInUser(_email: string, _password: string): Promise<User> {
  return { uid: 'mock-user', email: 'trader@machefunded.com' }
}

export async function sendRegistrationOTP(_email: string): Promise<void> {
  return
}

export async function createUserAccount(_email: string, _password: string): Promise<User> {
  return { uid: 'mock-user', email: 'trader@machefunded.com' }
}

export async function signOutUser(): Promise<void> {
  return
}

export function getCurrentFirebaseUser(): User | null {
  return { uid: 'mock-user', email: 'trader@machefunded.com' }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  callback(getCurrentFirebaseUser())
  return () => undefined
}

export async function getIdToken(): Promise<string> {
  return 'mock-token'
}

export async function fetchCurrentUser(): Promise<AuthMeResponse> {
  return apiFetch<AuthMeResponse>('/trader/me')
}

export async function loginWithBackend(): Promise<AuthMeResponse> {
  const user = await apiFetch<AuthMeResponse>('/trader/me')
  persistAuthUser(user)
  return user
}

export async function updateProfile(payload: { first_name?: string; last_name?: string; nick_name?: string | null }): Promise<AuthMeResponse> {
  const response = await apiFetch<AuthMeResponse>('/trader/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  persistAuthUser(response)
  return response
}

export async function logoutFromBackend(): Promise<void> {
  return
}

export function persistAuthUser(user: AuthMeResponse): void {
  localStorage.setItem('nairatrader_auth_user', JSON.stringify(user))
}

export function getPersistedAuthUser(): AuthMeResponse | null {
  const raw = localStorage.getItem('nairatrader_auth_user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthMeResponse
  } catch {
    return null
  }
}

export function clearPersistedAuthUser(): void {
  localStorage.removeItem('nairatrader_auth_user')
}