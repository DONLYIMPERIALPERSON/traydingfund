import { env } from '../config/env'
import crypto from 'crypto'

const debugSafeHaven = (...args: unknown[]) => {
  if (env.nodeEnv !== 'production' && process.env.DEBUG_SAFEHAVEN === 'true') {
    console.log('[safehaven]', ...args)
  }
}

class SafeHavenResponseError extends Error {
  status: number | undefined
  headers: Record<string, string> | undefined
  rawResponse: string | undefined

  constructor(message: string, options: { status?: number; headers?: Record<string, string>; rawResponse?: string } = {}) {
    super(message)
    this.name = 'SafeHavenResponseError'
    this.status = options.status
    this.headers = options.headers
    this.rawResponse = options.rawResponse
  }
}

type SafeHavenTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

type SafeHavenVirtualAccountResponse = {
  _id?: string
  accountNumber?: string
  accountName?: string
  bankName?: string
  bankCode?: string
  amount?: number
  sessionId?: string
  expiryDate?: string
  account_number?: string
  account_name?: string
  bank_name?: string
  bank_code?: string
  session_id?: string
  expiry_date?: string
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

export type SafeHavenTransferResponse = {
  statusCode?: number
  responseCode?: string
  message?: string
  data?: {
    sessionId?: string
    reference?: string
    transactionReference?: string
    status?: string
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

  try {
    crypto.createPrivateKey({ key: normalizedKey, format: 'pem' })
  } catch (error) {
    console.error('SAFEHAVEN PRIVATE KEY ERROR:', {
      message: error instanceof Error ? error.message : String(error),
      hasBeginMarker: normalizedKey.includes('BEGIN'),
      hasEndMarker: normalizedKey.includes('END'),
      length: normalizedKey.length,
      preview: normalizedKey.slice(0, 80),
    })
    throw new Error(
      'SAFEHAVEN_PRIVATE_KEY is invalid. Ensure the production env value is a valid PEM private key with BEGIN/END markers and escaped newlines preserved.'
    )
  }

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

  const rawText = await response.text()
  const responseHeaders = Object.fromEntries(response.headers.entries())

  debugSafeHaven('token status', response.status)

  if (!response.ok) {
    console.error('SAFEHAVEN TOKEN REQUEST FAILED:', {
      status: response.status,
      headers: responseHeaders,
      raw: rawText,
    })
    throw new SafeHavenResponseError(
      `SafeHaven token request failed with status ${response.status}. Raw response: ${rawText}`,
      { status: response.status, headers: responseHeaders, rawResponse: rawText }
    )
  }

  try {
    const parsed = JSON.parse(rawText) as SafeHavenTokenResponse
    debugSafeHaven('token parsed', { expiresIn: parsed.expires_in, tokenType: parsed.token_type })

    return parsed
  } catch (err) {
    console.error('SAFEHAVEN TOKEN PARSE ERROR:', err)
    console.error('RAW TOKEN RESPONSE WAS:', rawText)
    throw new SafeHavenResponseError(
      `SafeHaven token parse failed. Raw response: ${rawText}`,
      { status: response.status, headers: responseHeaders, rawResponse: rawText }
    )
  }
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

  const rawText = await response.text()
  const responseHeaders = Object.fromEntries(response.headers.entries())

  debugSafeHaven('request status', { path, status: response.status })

  if (!response.ok) {
    console.error('SAFEHAVEN REQUEST FAILED:', {
      path,
      status: response.status,
      headers: responseHeaders,
      raw: rawText,
    })
    throw new SafeHavenResponseError(
      `SafeHaven request failed for ${path} with status ${response.status}. Raw response: ${rawText}`,
      { status: response.status, headers: responseHeaders, rawResponse: rawText }
    )
  }

  try {
    const parsed = JSON.parse(rawText) as T
    debugSafeHaven('request parsed', { path, ok: true })

    return parsed
  } catch (err) {
    console.error('SAFEHAVEN PARSE ERROR:', err)
    console.error('RAW RESPONSE WAS:', rawText)
    throw new SafeHavenResponseError(
      `SafeHaven parse failed for ${path}. Raw response: ${rawText}`,
      { status: response.status, headers: responseHeaders, rawResponse: rawText }
    )
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const normalizeVirtualAccount = (raw: unknown): SafeHavenVirtualAccountResponse => {
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  const payload = (raw as { data?: Record<string, unknown> }).data ?? (raw as Record<string, unknown>)

  const accountNumber =
    (payload as { accountNumber?: string }).accountNumber
    ?? (payload as { account_number?: string }).account_number
    ?? (payload as { virtualAccountNumber?: string }).virtualAccountNumber
    ?? (payload as { nuban?: string }).nuban
    ?? (payload as { account?: { accountNumber?: string } }).account?.accountNumber
    ?? (payload as { account?: { account_number?: string } }).account?.account_number
    ?? (payload as { account?: { number?: string } }).account?.number
    ?? (payload as { account?: { nuban?: string } }).account?.nuban

  const accountName =
    (payload as { accountName?: string }).accountName
    ?? (payload as { account_name?: string }).account_name
    ?? (payload as { virtualAccountName?: string }).virtualAccountName
    ?? (payload as { account?: { accountName?: string } }).account?.accountName
    ?? (payload as { account?: { account_name?: string } }).account?.account_name
    ?? (payload as { account?: { name?: string } }).account?.name

  const bankName =
    (payload as { bankName?: string }).bankName
    ?? (payload as { bank_name?: string }).bank_name
    ?? (payload as { bank?: { name?: string } }).bank?.name
    ?? (payload as { account?: { bankName?: string } }).account?.bankName
    ?? (payload as { account?: { bank_name?: string } }).account?.bank_name

  const bankCode =
    (payload as { bankCode?: string }).bankCode
    ?? (payload as { bank_code?: string }).bank_code
    ?? (payload as { bank?: { code?: string } }).bank?.code
    ?? (payload as { account?: { bankCode?: string } }).account?.bankCode
    ?? (payload as { account?: { bank_code?: string } }).account?.bank_code

  const amount =
    (payload as { amount?: number }).amount
    ?? (payload as { amountValue?: number }).amountValue
    ?? (payload as { amount_in_kobo?: number }).amount_in_kobo

  const sessionId =
    (payload as { sessionId?: string }).sessionId
    ?? (payload as { session_id?: string }).session_id

  const expiryDate =
    (payload as { expiryDate?: string }).expiryDate
    ?? (payload as { expiry_date?: string }).expiry_date
    ?? (payload as { expires_at?: string }).expires_at

  const normalized: SafeHavenVirtualAccountResponse = {}
  const resolvedId = (payload as { _id?: string })._id ?? (payload as { id?: string }).id
  if (resolvedId) {
    normalized._id = resolvedId
  }
  if (accountNumber) {
    normalized.accountNumber = accountNumber
  }
  if (accountName) {
    normalized.accountName = accountName
  }
  if (bankName) {
    normalized.bankName = bankName
  }
  if (bankCode) {
    normalized.bankCode = bankCode
  }
  if (typeof amount === 'number') {
    normalized.amount = amount
  }
  if (sessionId) {
    normalized.sessionId = sessionId
  }
  if (expiryDate) {
    normalized.expiryDate = expiryDate
  }

  if (!normalized.accountNumber || !normalized.accountName) {
    console.warn('SafeHaven virtual account missing identifiers:', {
      accountNumber: normalized.accountNumber,
      accountName: normalized.accountName,
      bankName: normalized.bankName,
      keys: Object.keys(payload),
      accountKeys: (payload as { account?: Record<string, unknown> }).account
        ? Object.keys((payload as { account?: Record<string, unknown> }).account as Record<string, unknown>)
        : [],
    })
  }

  return normalized
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


  const normalized = normalizeVirtualAccount(response)
  if (!normalized.accountNumber || !normalized.accountName) {
    const fallbackId = normalized._id
      ?? (response as { data?: { _id?: string; id?: string } }).data?._id
      ?? (response as { data?: { _id?: string; id?: string } }).data?.id
      ?? (response as { _id?: string; id?: string })._id
      ?? (response as { _id?: string; id?: string }).id
    if (fallbackId) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          if (attempt > 0) {
            await delay(1000)
          }
          const fetched = await fetchVirtualAccount(fallbackId)
          const merged = { ...normalized, ...fetched }
          if (merged.accountNumber && merged.accountName) {
            return merged
          }
        } catch (error) {
          console.warn('Failed to fetch SafeHaven virtual account details', error)
        }
      }
    }
  }

  return normalized
}

export const fetchVirtualAccount = async (id: string) => {
  const response = await makeAuthenticatedRequest<
    SafeHavenVirtualAccountResponse | { data?: SafeHavenVirtualAccountResponse }
  >(`/virtual-accounts/${id}`)


  return normalizeVirtualAccount(response)
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

export const createTransfer = async (payload: {
  nameEnquiryReference: string
  debitAccountNumber: string
  beneficiaryBankCode: string
  beneficiaryAccountNumber: string
  amount: number
  saveBeneficiary?: boolean
  narration?: string
  paymentReference?: string
}) => {
  if (!payload.nameEnquiryReference) {
    throw new Error('SafeHaven transfer requires a name enquiry reference')
  }

  if (!payload.debitAccountNumber) {
    throw new Error('SafeHaven transfer requires a debit account number')
  }

  if (!payload.beneficiaryBankCode || !payload.beneficiaryAccountNumber) {
    throw new Error('SafeHaven transfer requires beneficiary bank details')
  }

  if (!payload.amount || Number.isNaN(payload.amount) || payload.amount <= 0) {
    throw new Error('SafeHaven transfer amount must be greater than zero')
  }

  return makeAuthenticatedRequest<SafeHavenTransferResponse>('/transfers', {
    method: 'POST',
    body: JSON.stringify({
      nameEnquiryReference: payload.nameEnquiryReference,
      debitAccountNumber: payload.debitAccountNumber,
      beneficiaryBankCode: payload.beneficiaryBankCode,
      beneficiaryAccountNumber: payload.beneficiaryAccountNumber,
      amount: payload.amount,
      saveBeneficiary: payload.saveBeneficiary ?? false,
      narration: payload.narration ?? 'Affiliate payout',
      paymentReference: payload.paymentReference,
    }),
  })
}