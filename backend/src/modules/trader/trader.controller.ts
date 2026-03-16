import { Request, Response } from 'express'

export const getMe = (_req: Request, res: Response) => {
  res.json({
    id: 101,
    descope_user_id: 'mock-user-101',
    email: 'trader@machefunded.com',
    full_name: 'Alex Trader',
    nick_name: 'ProTrader',
    role: 'trader',
    status: 'active',
    kyc_status: 'verified',
    use_nickname_for_certificates: true,
  })
}

export const listChallengeAccounts = (_req: Request, res: Response) => {
  res.json({
    has_any_accounts: true,
    has_active_accounts: true,
    active_accounts: [
      {
        challenge_id: 'mock-challenge-001',
        account_size: '$50K',
        phase: 'Phase 1',
        objective_status: 'on_track',
        display_status: 'Active',
        is_active: true,
        mt5_account: '12345678',
        started_at: new Date().toISOString(),
        breached_at: null,
        passed_at: null,
        passed_stage: null,
      },
    ],
    history_accounts: [],
  })
}