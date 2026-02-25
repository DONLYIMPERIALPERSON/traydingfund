# Account Monitor Engine → Backend Feed Contract

This document defines how the external account-monitor engine should report MT5 challenge account state to the backend.

## Endpoint

- **Method:** `POST`
- **Path:** `/internal/feed/{account_number}`
- **Header:** `X-Challenge-Feed-Secret: <CHALLENGE_FEED_SECRET>`
- **Content-Type:** `application/json`

## Core behavior rules (important)

1. **Breach is immediate**
   - If backend receives `equity_breach_signal=true` or `balance_breach_signal=true`, account is breached immediately.
   - Backend fallback breach still applies if no signal is sent (e.g. equity below breach balance, scalping threshold reached).

2. **Pass is objective-gated**
   - Profit target alone does not transition stage.
   - Stage transition happens only when:
     - profit target objective is met, **and**
     - min trading days objective is met.

3. **Automatic pass trigger timing**
   - Backend evaluates pass logic **whenever this endpoint is called**.
   - Therefore engine should send **heartbeat updates** (recommended every 1–5 minutes), even when no trades occur, so pass can trigger immediately once min days is satisfied.

## Request payload

### Required

```json
{
  "balance": 110000,
  "equity": 109800
}
```

- `account_number` (string): MT5 account number/login (provided in the URL path).
- `balance` (number > 0): latest balance.
- `equity` (number > 0, recommended always): latest equity.

### Optional control signals (engine-priority)

- `equity_breach_signal` (bool)
- `balance_breach_signal` (bool)
- `stage_pass_signal` (bool)
- `scalping_breach_increment` (int >= 0)

When these are present, backend prioritizes them over fallback detection.

### Optional raw/fallback scalping data

- `closed_trade_durations_seconds` (array of int)

Used only when `scalping_breach_increment` is not provided.

### Optional trade aggregates (for win-rate / stats)

- `closed_trades_count_increment` (int >= 0)
- `winning_trades_count_increment` (int >= 0)
- `lots_traded_increment` (float >= 0)

### Optional daily aggregates (for daily summary)

- `today_closed_pnl` (float)
- `today_trades_count` (int >= 0)
- `today_lots_total` (float >= 0)

### Optional timestamp

- `observed_at` (ISO8601 datetime)

If omitted, backend uses server current UTC time.

## Full example payload

```json
{
  "balance": 111250.45,
  "equity": 110930.12,
  "closed_trade_durations_seconds": [420, 95],

  "scalping_breach_increment": 1,
  "equity_breach_signal": false,
  "balance_breach_signal": false,
  "stage_pass_signal": null,

  "closed_trades_count_increment": 3,
  "winning_trades_count_increment": 2,
  "lots_traded_increment": 0.84,

  "today_closed_pnl": 1250.45,
  "today_trades_count": 7,
  "today_lots_total": 1.98,

  "observed_at": "2026-02-19T20:00:00Z"
}
```

## Key response fields to consume

- `objective_status`
- `breached_reason`
- `transitioned_to_stage`
- `unrealized_pnl`
- `max_permitted_loss_left`
- `win_rate`
- `min_trading_days_required`
- `min_trading_days_met`
- `stage_elapsed_hours`

These values can power user/admin objective indicators and account analytics cards.
