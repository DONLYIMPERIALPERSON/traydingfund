export type AccessGrantRequest = {
  user_email: string
  account_number: string
  broker: string
  platform: string
  mt5_login?: string
  mt5_server?: string
  mt5_password?: string
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