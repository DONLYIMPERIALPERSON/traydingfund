# Finance Engine

Service for handling manual finance approvals (phase pass resets, withdrawals, and balance adjustments) and routing them through Telegram commands.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

## Telegram Commands

- `/reset_done <account>`
- `/withdraw_approved <account> [amount]`
- `/withdraw_done <account>`
- `/adjust_balance <account> <amount> [reason]`

These commands call back into the backend endpoints configured in `.env`.

## Backend Endpoints

The backend must expose:

- `POST /api/v1/finance/reset-complete`
- `POST /api/v1/finance/withdraw-approved`
- `POST /api/v1/finance/withdraw-complete`
- `POST /api/v1/finance/adjust-balance`

Each endpoint expects `x-finance-engine-key` and a JSON body with `account_number` (and `amount` for adjustments).