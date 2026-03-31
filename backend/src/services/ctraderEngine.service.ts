import { env } from '../config/env'

export type EngineActiveAccount = {
  accountNumber: string
  phase?: string | number | null
  status?: string | null
  challengeType?: string | null
}

const buildUrl = (path: string) => {
  const base = env.ctraderEngineWebhookUrl
  if (!base) return null
  return `${base.replace(/\/$/, '')}${path}`
}

const postToEngine = async (path: string, body: Record<string, unknown>) => {
  const url = buildUrl(path)
  if (!url) {
    return { skipped: true }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ENGINE-SECRET': env.ctraderEngineSecret,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Engine request failed (${response.status})`)
  }

  return response.json().catch(() => ({}))
}

export const pushActiveAccountAdd = async (account: EngineActiveAccount) => {
  if (!account.accountNumber) return
  await postToEngine('/internal/active-accounts/add', { account })
  console.log(`[engine-push] added active account ${account.accountNumber}`)
}

export const pushActiveAccountRemove = async (accountNumber: string, reason?: string) => {
  if (!accountNumber) return
  await postToEngine('/internal/active-accounts/remove', { accountNumber, reason })
  console.log(`[engine-push] removed active account ${accountNumber} reason=${reason ?? 'unknown'}`)
}

export const pushActiveAccountFullSync = async (accounts: EngineActiveAccount[]) => {
  await postToEngine('/internal/active-accounts/sync', { accounts })
  console.log(`[engine-push] full sync sent count=${accounts.length}`)
}