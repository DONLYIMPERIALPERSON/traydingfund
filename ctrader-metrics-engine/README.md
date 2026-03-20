# cTrader Metrics Engine

This service connects to cTrader Open API **via WebSocket + protobuf**, listens for account updates, and posts balance/equity + recent trades to the backend `/ctrader/metrics` endpoint.

## Setup

1. Copy `.env.example` to `.env` and fill in the values (client id/secret, access token, account ids).
2. Install dependencies:

```bash
cd ctrader-metrics-engine
npm install
```

3. Start the engine:

```bash
npm run dev
```

## Payload

The engine sends the backend MetricsPayload:

```json
{
  "account_number": "12345",
  "balance": 10000,
  "equity": 10050,
  "trades": [
    {
      "ticket": "98765",
      "open_time": "2025-01-01T10:00:00.000Z",
      "close_time": "2025-01-01T10:05:00.000Z",
      "profit": 50
    }
  ]
}
```

## How it works (simple)

1. Opens a WebSocket connection to cTrader (`CTRADER_WS_URL`).
2. Authenticates the app (`clientId` + `clientSecret`).
3. Authenticates each account (`accountId` + `accessToken`).
4. Listens for account and trade events.
5. Sends the metrics payload to the backend.

## Notes

- WebSocket messages are **binary protobuf**, not REST calls.
- Proto files are loaded from `proto/` (from the official Spotware repo).
- The backend expects `X-ENGINE-SECRET` to match `env.ctraderEngineSecret` on the API.