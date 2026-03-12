# Thermostat REST API Documentation

## Overview

This document describes the REST API endpoints for a multi-zone home thermostat server. Thermostat clients communicate with the server on a **heartbeat cycle**, alternating between:

1. **POST** — reporting current thermostat status to the server.
2. **GET** — fetching any pending commands or configuration updates from the server.

The API supports an arbitrary number of thermostat zones, with a minimum of **2 zones**.

---

## Base URL

```
http://<server-host>:<port>/api/v1
```

---

## Data Models

### Zone Object

```json
{
  "zoneId": "zone-1",
  "name": "Living Room",
  "currentTemp": 20.5,
  "humidity": 45.2,
  "status": "heating",
  "online": true,
  "lastSeen": "2026-03-12T10:30:00Z"
}
```

| Field        | Type    | Description                                                    |
|--------------|---------|----------------------------------------------------------------|
| `zoneId`     | string  | Unique identifier for the zone                                 |
| `name`       | string  | Human-readable zone label                                      |
| `currentTemp`| float   | Current measured temperature (°C or °F, server-configured)     |
| `humidity`   | float   | Relative humidity percentage (optional)                        |
| `status`     | string  | One of: `heating`, `idle`, `off`                               |
| `online`     | boolean | Whether the client is considered reachable                     |
| `lastSeen`   | string  | ISO 8601 timestamp of the most recent heartbeat                |

### Settings Object

```json
{
  "targetTemp": 22.0,
  "mode": "heat",
  "hold": false,
  "scheduleEnabled": true
}
```

| Field             | Type    | Description                                                        |
|-------------------|---------|--------------------------------------------------------------------|
| `targetTemp`      | float   | Desired setpoint temperature                                       |
| `mode`            | string  | One of: `heat`, `off`                                              |
| `hold`            | boolean | If `true`, ignores schedule and holds current setpoint             |
| `scheduleEnabled` | boolean | Whether the zone's schedule is active                              |

---

## Endpoints

### Zones

#### `GET /zones`
Returns a list of all registered thermostat zones and their current status.

**Response `200 OK`**
```json
[
  {
    "zoneId": "zone-1",
    "name": "Living Room",
    "currentTemp": 20.5,
    "humidity": 45.2,
    "hvacState": "heating",
    "fanState": "auto",
    "online": true,
    "lastSeen": "2026-03-12T10:30:00Z"
  },
  {
    "zoneId": "zone-2",
    "name": "Bedroom",
    "currentTemp": 19.1,
    "humidity": 50.0,
    "hvacState": "idle",
    "fanState": "auto",
    "online": true,
    "lastSeen": "2026-03-12T10:29:55Z"
  }
]
```

---

#### `POST /zones`
Registers a new thermostat zone on the server.

**Request Body**
```json
{
  "zoneId": "zone-3",
  "name": "Guest Room"
}
```

**Response `201 Created`**
```json
{
  "zoneId": "zone-3",
  "name": "Guest Room",
  "online": false,
  "lastSeen": null
}
```

---

#### `GET /zones/{zoneId}`
Returns the current status of a single zone.

**Path Parameters**

| Parameter | Type   | Description             |
|-----------|--------|-------------------------|
| `zoneId`  | string | The target zone ID      |

**Response `200 OK`** — returns a single [Zone Object](#zone-object).

**Response `404 Not Found`**
```json
{ "error": "Zone not found" }
```

---

#### `DELETE /zones/{zoneId}`
Removes a zone from the server.

**Response `204 No Content`**

---

### Heartbeat — Status Report (Client → Server)

#### `POST /zones/{zoneId}/status`

The thermostat client calls this endpoint on each heartbeat to push its current sensor readings and operational state to the server.

**Path Parameters**

| Parameter | Type   | Description        |
|-----------|--------|--------------------|
| `zoneId`  | string | The reporting zone |

**Request Body**
```json
{
  "currentTemp": 20.5,
  "humidity": 45.2,
  "status": "heating",
  "timestamp": "2026-03-12T10:30:00Z"
}
```

| Field         | Type   | Required | Description                            |
|---------------|--------|----------|----------------------------------------|
| `currentTemp` | float  | Yes      | Current measured temperature           |
| `humidity`    | float  | No       | Current relative humidity              |
| `status`      | string | Yes      | One of: `heating`, `idle`, `off`       |
| `timestamp`   | string | Yes      | ISO 8601 client-side timestamp         |

**Response `200 OK`**
```json
{ "received": true }
```

**Response `404 Not Found`**
```json
{ "error": "Zone not found" }
```

---

### Heartbeat — Fetch Updates (Server → Client)

#### `GET /zones/{zoneId}/updates`

The thermostat client calls this endpoint immediately after posting its status to check for any pending commands or configuration changes the server needs the client to act on.

The server clears pending commands after they are successfully delivered.

**Path Parameters**

| Parameter | Type   | Description        |
|-----------|--------|--------------------|
| `zoneId`  | string | The polling zone   |

**Response `200 OK`** — pending updates present
```json
{
  "hasPendingUpdates": true,
  "settings": {
    "targetTemp": 22.0,
    "mode": "heat",
    "fanMode": "auto",
    "hold": false,
    "scheduleEnabled": true
  },
  "commands": [
    { "action": "reboot" }
  ]
}
```

**Response `200 OK`** — no pending updates
```json
{
  "hasPendingUpdates": false,
  "settings": null,
  "commands": []
}
```

| Field               | Type    | Description                                          |
|---------------------|---------|------------------------------------------------------|
| `hasPendingUpdates` | boolean | Whether the client needs to act on anything          |
| `settings`          | object  | New [Settings Object](#settings-object) if changed, else `null` |
| `commands`          | array   | List of imperative commands for the client to execute |

**Supported Commands**

| Action    | Description                                |
|-----------|--------------------------------------------|
| `reboot`  | Instructs the client device to restart     |
| `sync`    | Forces a full settings re-sync             |
| `ping`    | No-op, used to verify client responsiveness|

---

### Settings

#### `GET /zones/{zoneId}/settings`
Returns the current target settings for a zone.

**Response `200 OK`** — returns a [Settings Object](#settings-object).

---

#### `PUT /zones/{zoneId}/settings`
Updates the target settings for a zone. These will be delivered to the client on its next `GET /zones/{zoneId}/updates` heartbeat.

**Request Body** — partial or full [Settings Object](#settings-object)
```json
{
  "targetTemp": 21.5,
  "hold": true
}
```

**Response `200 OK`** — returns the full updated [Settings Object](#settings-object).

---

### Schedule

#### `GET /zones/{zoneId}/schedule`
Returns the active weekly schedule for a zone.

**Response `200 OK`**
```json
{
  "zoneId": "zone-1",
  "schedule": [
    {
      "day": "monday",
      "entries": [
        { "time": "07:00", "targetTemp": 21.0, "mode": "heat" },
        { "time": "09:00", "targetTemp": 18.0, "mode": "heat" },
        { "time": "17:30", "targetTemp": 22.0, "mode": "heat" },
        { "time": "23:00", "targetTemp": 17.0, "mode": "heat" }
      ]
    }
  ]
}
```

---

#### `PUT /zones/{zoneId}/schedule`
Replaces the full weekly schedule for a zone.

**Request Body** — same schema as the `GET /zones/{zoneId}/schedule` response body.

**Response `200 OK`** — returns the updated schedule.

---

### System

#### `GET /system/info`
Returns general server and system configuration.

**Response `200 OK`**
```json
{
  "serverVersion": "1.0.0",
  "temperatureUnit": "celsius",
  "heartbeatIntervalSeconds": 30,
  "totalZones": 2,
  "uptime": "3d 4h 12m"
}
```

---

#### `GET /system/health`
Lightweight health check endpoint. Can be polled by monitoring tools.

**Response `200 OK`**
```json
{ "status": "ok" }
```

---

## Heartbeat Cycle Summary

```
┌─────────────────────────────────────────────────────┐
│                  Thermostat Client                  │
│                                                     │
│  Every N seconds:                                   │
│                                                     │
│  1. POST /zones/{zoneId}/status   (report state)    │
│          │                                          │
│          ▼                                          │
│  2. GET  /zones/{zoneId}/updates  (fetch commands)  │
│          │                                          │
│          ▼                                          │
│  3. Apply any settings or commands received         │
│                                                     │
│  4. Sleep until next heartbeat interval             │
└─────────────────────────────────────────────────────┘
```

---

## Error Responses

All error responses follow a consistent envelope:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

| HTTP Status | Meaning                                              |
|-------------|------------------------------------------------------|
| `200`       | Success                                              |
| `201`       | Resource created                                     |
| `204`       | Success, no content returned                         |
| `400`       | Bad request — malformed body or missing fields       |
| `404`       | Resource not found                                   |
| `409`       | Conflict — e.g. zone ID already exists               |
| `500`       | Internal server error                                |