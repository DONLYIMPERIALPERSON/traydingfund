# Access Engine

Standalone service that bridges the backend and Telegram for access provisioning.

## What it does
- Receives access requests from the backend at `POST /access-engine/grant`.
- Sends a Telegram message to your admin chat with the request.
- Admin confirms access in Telegram using: `/access_granted<accountnumber>`.
- Access Engine calls the backend endpoint to update access status.

## Setup
1. Copy `.env.example` → `.env` and fill in values.
2. Install dependencies:
   ```bash
   cd access-engine
   npm install
   ```
3. Run in dev mode:
   ```bash
   npm run dev
   ```

## Environment Variables
- `PORT`: Service port (default 5005)
- `BACKEND_BASE_URL`: Base URL of backend (e.g. http://localhost:4000)
- `BACKEND_ACCESS_CONFIRM_PATH`: Backend endpoint path for confirmations (default `/trader/access-confirmed`)
- `ACCESS_ENGINE_API_KEY`: Shared secret used by backend to authenticate requests
- `TELEGRAM_BOT_TOKEN`: Telegram bot token
- `TELEGRAM_CHAT_ID`: Chat/channel ID to send requests
- `TELEGRAM_ALLOWED_USERS`: Optional comma-separated Telegram user IDs allowed to issue commands
- `TELEGRAM_COMMAND_PREFIX`: Default `/access_granted`

## Backend Integration
Backend should call:
```
POST {ACCESS_ENGINE_BASE_URL}/access-engine/grant
Headers: x-access-engine-key: <ACCESS_ENGINE_API_KEY>
Body: { user_email, account_number, broker, platform }
```

Access Engine then calls backend:
```
POST {BACKEND_BASE_URL}/trader/access-confirmed
Headers: x-access-engine-key: <ACCESS_ENGINE_API_KEY>
Body: { account_number, user_email, status: "granted" }
```

## Telegram Command
```
/access_granted<accountnumber>
```
Example:
```
/access_granted12345678
```