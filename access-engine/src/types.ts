export type AccessGrantRequest = {
  user_email: string
  account_number: string
  broker: string
  platform: string
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