import { env } from '../config/env'

type GrantAccessPayload = {
  user_email: string
  account_number: string
  broker: string
  platform: string
  user_name?: string | undefined
  account_type?: string | undefined
  account_phase?: string | undefined
  account_size?: string | undefined
}

export const requestAccountAccess = async (payload: GrantAccessPayload) => {
  const response = await fetch(`${env.accessEngineBaseUrl}/access-engine/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.accessEngineApiKey ? { 'x-access-engine-key': env.accessEngineApiKey } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Failed to request access from access engine')
  }

  return response.json() as Promise<{ status?: string; message?: string }>
}