# Breezy Replay Engine

Separate FastAPI replay engine for **Breezy accounts**.

This service replays account equity using:
- open positions
- closed deals
- symbol metadata
- historical ticks

Unlike the main risk engine, this one is designed for **Breezy account evaluation**.

## What it evaluates

- 50% capital protection breach
- account active/terminated status
- realized profit
- closed trades count
- withdrawal eligibility
- profit split percentage
- risk score output placeholder

## Current note

The replay/equity reconstruction flow is implemented now.
For Breezy scoring, the engine now relies primarily on **actual replay behavior** (real adverse excursion from tick replay) rather than stop-loss intent, since SL can be edited and is not always reliable to track historically on MT5.

## Endpoints

- `POST /breezy/replay/ea` – enqueue a Breezy replay job from EA-style payload
- `POST /breezy/replay/input` – manually provide replay inputs
- `GET /breezy/replay/result/{session_id}` – fetch replay status/result
- `GET /breezy/replay/sessions` – list sessions in memory
- `GET /health` – health check

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8215
```

## Breezy output shape

Example result fields:

```json
{
  "account_status": "active",
  "breach_reason": null,
  "capital_protection_level": 100000,
  "risk_score": 0,
  "risk_score_band": "PENDING_LOGIC",
  "profit_split": 0,
  "withdrawal_eligible": false,
  "withdrawal_block_reason": "RISK_SCORE_TOO_LOW"
}
```