export type AccessGrantRequest = {
  user_email: string
  account_number: string
  broker: string
  platform: string
  user_name?: string
  account_type?: string
  account_phase?: string
  account_size?: string
}

export type AccessGrantResponse = {
  status: 'queued' | 'sent'
  message: string
}

export type AccessCommandResult = {
  accountNumber: string
  status: 'granted' | 'rejected'
  message: string
}