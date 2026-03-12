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

API endpoints

- `GET /api/heartbeat` — server heartbeat
- `GET /api/devices/:id` — get last known data for a device
- `POST /api/devices/:id` — post heartbeat data from a device (JSON body: `temperature` number, `mode` string, optional `timestamp`)

Sample client

Use the included `client/heartbeatClient.js` to send a test POST (Node 18+):

```bash
node client/heartbeatClient.js my-device http://localhost:3000
```

Notes

- This prototype uses an in-memory store (`lib/dataStore.js`). For production, replace with a persistent DB.
- Adjust validation and authentication as needed.
