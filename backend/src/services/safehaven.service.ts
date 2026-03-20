import { env } from '../config/env'
import crypto from 'crypto'

type SafeHavenTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

type SafeHavenVirtualAccountResponse = {
  _id: string
  accountNumber: string
  accountName: string
  bankName: string
  bankCode?: string
  amount?: number
  sessionId?: string
  expiryDate?: string
}

export type SafeHavenNameEnquiryResponse = {
  statusCode: number
  responseCode: string
  message: string
  data?: {
    accountName?: string
    accountNumber?: string
    bankCode?: string
    reference?: string
    sessionId?: string
    [key: string]: unknown
  }
}

const getAudience = () => env.safehavenAudience || env.safehavenBaseUrl

const base64UrlEncode = (value: string) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

const createClientAssertion = async () => {
  if (!env.safehavenPrivateKey || !env.safehavenClientId) {
    throw new Error('SafeHaven credentials are not configured')
  }

  const normalizedKey = env.safehavenPrivateKey.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: 'https://flyvixx.com',
    sub: env.safehavenClientId,
    aud: getAudience(),
    iat: now,
    exp: now + 40 * 60,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const data = `${encodedHeader}.${encodedPayload}`

  const signer = crypto.createSign('RSA-SHA256')
  signer.update(data)
  signer.end()
  const signature = signer.sign(normalizedKey)
  const encodedSignature = signature
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${data}.${encodedSignature}`
}

const requestAccessToken = async () => {
  const assertion = await createClientAssertion()
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.safehavenClientId,
    client_assertion: assertion,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
  })

  const response = await fetch(`${env.safehavenBaseUrl}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`SafeHaven token request failed: ${text}`)
  }

  return (await response.json()) as SafeHavenTokenResponse
}

const makeAuthenticatedRequest = async <T>(path: string, init: RequestInit = {}) => {
  const tokenResponse = await requestAccessToken()
  const response = await fetch(`${env.safehavenBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenResponse.access_token}`,
      ClientID: env.safehavenClientId,
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`SafeHaven request failed: ${text}`)
  }

  return (await response.json()) as T
}

export const createVirtualAccount = async (payload: {
  amount: number
  externalReference: string
  validFor?: number
  amountControl?: 'Fixed' | 'UnderPayment' | 'OverPayment'
}) => {
  if (!env.appPublicBaseUrl) {
    throw new Error('APP_PUBLIC_BASE_URL is not configured')
  }

  if (!payload.amount || Number.isNaN(payload.amount)) {
    throw new Error('SafeHaven amount must be provided')
  }

  const requestBody = {
    validFor: payload.validFor ?? 900,
    callbackUrl: `${env.appPublicBaseUrl}/api/v1/trader/safehaven/webhook`,
    amount: payload.amount,
    amountControl: payload.amountControl ?? 'Fixed',
    settlementAccount: {
      amountControl: payload.amountControl ?? 'Fixed',
      amount: payload.amount,
      bankCode: env.safehavenSettlementBankCode || undefined,
      accountNumber: env.safehavenSettlementAccountNumber || undefined,
    },
    externalReference: payload.externalReference,
  }

  if (env.nodeEnv !== 'production') {
    console.log('SafeHaven virtual account request payload:', requestBody)
  }

  const response = await makeAuthenticatedRequest<
    SafeHavenVirtualAccountResponse | { data?: SafeHavenVirtualAccountResponse }
  >('/virtual-accounts', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  })

  if (response && typeof response === 'object' && 'data' in response && response.data) {
    return response.data
  }

  return response as SafeHavenVirtualAccountResponse
}

export const fetchVirtualAccount = async (id: string) => {
  const response = await makeAuthenticatedRequest<
    SafeHavenVirtualAccountResponse | { data?: SafeHavenVirtualAccountResponse }
  >(`/virtual-accounts/${id}`)

  if (response && typeof response === 'object' && 'data' in response && response.data) {
    return response.data
  }

  return response as SafeHavenVirtualAccountResponse
}

export const queryVirtualAccountStatus = async (sessionId: string) =>
  makeAuthenticatedRequest<{ status: string; sessionId: string }>(
    '/virtual-accounts/status',
    {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }
  )

export const resolveAccountName = async (payload: { bankCode: string; accountNumber: string }) =>
  makeAuthenticatedRequest<SafeHavenNameEnquiryResponse>(
    '/transfers/name-enquiry',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )