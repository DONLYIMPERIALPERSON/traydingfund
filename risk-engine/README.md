# Replay Equity Curve Service

Small FastAPI helper for replaying MT5 equity curves and returning the key fields the backend/UI needs for breach logic.

## Endpoints

- `POST /replay/ea` – submit EA metrics payload (similar shape to MT5 metrics payload).
- `POST /replay/input` – submit replay inputs (initial balance, DD limits).
- `GET /replay/result/{session_id}` – compute breach fields and return results.
- `GET /replay/sessions` – list in-memory sessions.
- `GET /health` – health check.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8205
```

## Example workflow

1. Submit EA payload:

```bash
curl -X POST http://localhost:8205/replay/ea \
  -H "Content-Type: application/json" \
  -d '{"account_number":"123","platform":"mt5","balance":10000,"equity":9800,"min_equity":9700,"peak_balance":10200,"daily_low_equity":9750}'
```

2. Submit replay input:

```bash
curl -X POST http://localhost:8205/replay/input \
  -H "Content-Type: application/json" \
  -d '{"account_number":"123","initial_balance":10000,"max_dd_amount":1000,"daily_dd_amount":500}'
```

3. Fetch result with the returned `session_id`:

```bash
curl http://localhost:8205/replay/result/{session_id}
```