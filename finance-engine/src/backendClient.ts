import axios from 'axios'
import { config } from './config'
import type { BackendResponse } from './types'

const client = axios.create({
  baseURL: config.backendBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'x-finance-engine-key': config.backendFinanceKey,
  },
})

export const notifyResetComplete = async (accountNumber: string) => {
  const response = await client.post<BackendResponse>(config.backendResetPath, {
    account_number: accountNumber,
  })
  return response.data
}

export const notifyWithdrawComplete = async (accountNumber: string) => {
  const response = await client.post<BackendResponse>(config.backendWithdrawPath, {
    account_number: accountNumber,
  })
  return response.data
}

export const notifyWithdrawApproved = async (accountNumber: string, amount?: number) => {
  const response = await client.post<BackendResponse>(config.backendWithdrawApprovedPath, {
    account_number: accountNumber,
    amount,
  })
  return response.data
}

export const notifyAdjustBalance = async (accountNumber: string, amount: number, reason?: string) => {
  const response = await client.post<BackendResponse>(config.backendAdjustPath, {
    account_number: accountNumber,
    amount,
    reason,
  })
  return response.data
}