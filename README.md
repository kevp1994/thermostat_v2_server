# Thermostat Server (Prototype)

This is a minimal Next.js-based REST API prototype for a thermostat backend.

Quick start

1. Ensure Node 18+ is installed.
2. From this folder run:

```bash
cd Server
npm install
npm run dev
```

API endpoints (prototype)

- `GET /api/heartbeat` — server heartbeat (legacy prototype)

Versioned API v1 endpoints (new, match spec):

- `GET /api/v1/zones` — list zones
- `POST /api/v1/zones` — disabled (zone creation moved to config)
- `GET /api/v1/zones/:zoneId` — get zone
- `DELETE /api/v1/zones/:zoneId` — delete zone
- `POST /api/v1/zones/:zoneId/status` — client heartbeat status (body: `currentTemp` number, `status` string, `timestamp` string, optional `humidity`)
- `GET  /api/v1/zones/:zoneId/updates` — fetch pending updates/commands
- `GET  /api/v1/zones/:zoneId/settings` — get settings
- `PUT  /api/v1/zones/:zoneId/settings` — update settings (partial)
- `GET  /api/v1/zones/:zoneId/schedule` — get schedule
- `PUT  /api/v1/zones/:zoneId/schedule` — replace schedule
- `GET  /api/v1/system/info` — system info
- `GET  /api/v1/system/health` — lightweight health

Sample client

Use the included `client/heartbeatClient.js` to send a test POST (Node 18+):

```bash
node client/heartbeatClient.js my-device http://localhost:3000
```

Notes

- This prototype uses an in-memory store (`lib/dataStore.js`). For production, replace with a persistent DB.
- Adjust validation and authentication as needed.

Configuring zones

- Zones are configured in `data/store.json`, which is the single source of truth for the running server. Edit that file and restart the server to apply changes.
- Avoid maintaining a separate `data/zones.json` file — it was removed to prevent duplication.

Admin endpoint

- A secured admin endpoint is available at `POST /api/v1/admin/store` and `GET /api/v1/admin/store`.
- Protect access by setting an environment variable `ADMIN_KEY` to a secret value. The endpoint expects the key in the `x-admin-key` header or `?key=` query parameter.
- `GET /api/v1/admin/store` — returns the current persisted store JSON.
- `POST /api/v1/admin/store?action=reload` — reloads `data/store.json` into memory (useful after editing the file externally).
- `POST /api/v1/admin/store?action=replace` — replace the entire store; include `{ "store": { ... } }` in the JSON body. Use with caution.
