# Thermostat Client API (firmware)

Base URL

```
http://<server-host>:<port>/api/v1
```

Heartbeat cycle (recommended)
- POST /zones/{zoneId}/status — client reports current state
- GET  /zones/{zoneId}/updates — client immediately fetches updates/commands

1) POST status (report)

Endpoint
```
POST /api/v1/zones/{zoneId}/status
```

Body (JSON)
```json
{
  "currentTemp": 20.5,        // number (required)
  "humidity": 45.2,           // number (optional)
  "status": "heating",      // string: one of "heating","idle","off" (required)
  "timestamp": "2026-03-12T10:30:00Z" // ISO 8601 (required)
}
```

Success Response
```
200 OK
{ "received": true }
```

Errors
- 400 Bad Request — malformed body
- 404 Not Found — unknown zone

2) GET updates (fetch server commands/settings)

Endpoint
```
GET /api/v1/zones/{zoneId}/updates
```

Response (200)
```json
{
  "hasPendingUpdates": false,
  "settings": null,
  "commands": []
}
```

- When `hasPendingUpdates` is true, `settings` contains the new Settings Object (or null), and `commands` is an array of imperative commands (e.g., `{ "action": "reboot" }`). The server clears pending updates after delivering them.

Settings API (server-controlled)
- GET /api/v1/zones/{zoneId}/settings — returns current settings for the zone
- PUT /api/v1/zones/{zoneId}/settings — submit a partial settings object; server will persist and queue it for the next client `updates` response

Settings object (example)
```json
{
  "targetTemp": 22.0,
  "mode": "heat",
  "hold": false,
  "scheduleEnabled": true
}
```

Zones
- GET /api/v1/zones — returns list of zones and status
- Note: zone creation is not exposed to clients; zones are configured server-side in `data/store.json`.

Schedule
- GET /api/v1/zones/{zoneId}/schedule
- PUT /api/v1/zones/{zoneId}/schedule

System
- GET /api/v1/system/info — returns serverVersion, temperatureUnit, heartbeatIntervalSeconds, totalZones
- GET /api/v1/system/health — returns `{ "status": "ok" }`

Legacy convenience endpoint
- GET/POST /api/targetTemp?zoneId={zoneId} — convenience wrapper that reads/updates `settings.targetTemp`. Prefer v1 endpoints.

Error envelope

All error responses follow this shape:
```json
{ "error": "Human-readable message", "code": "ERROR_CODE" }
```

Recommended firmware flow
1. On boot, fetch `/api/v1/zones/{zoneId}` to validate zone exists.
2. Every heartbeat interval (server advertises `heartbeatIntervalSeconds` via `/api/v1/system/info`, default 30s):
   - POST `/zones/{zoneId}/status` with readings
   - Immediately GET `/zones/{zoneId}/updates` and apply any `settings` or `commands`

Examples (curl)

Report status:
```bash
curl -X POST http://localhost:3000/api/v1/zones/zone-1/status \
  -H 'Content-Type: application/json' \
  -d '{"currentTemp":20.5,"status":"heating","timestamp":"2026-03-12T10:30:00Z","humidity":45.2}'
```

Fetch updates:
```bash
curl http://localhost:3000/api/v1/zones/zone-1/updates
```

Notes on security
- Currently the v1 API is unauthenticated; only the admin endpoint is protected by `ADMIN_KEY`.
- For production firmware, ensure the device communicates over TLS and implement authentication (API key, mutual TLS, or JWT). See `README.md` security section for planned options.

Contact
- If you need example client code (C, MicroPython, Arduino) for the heartbeat flow, tell me the target platform and I will provide a minimal snippet.
