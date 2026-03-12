// Minimal persistent datastore for v1 API
const fs = require('fs')
const fsp = require('fs').promises
const path = require('path')

const DATA_DIR = path.join(process.cwd(), 'data')
const STORE_PATH = path.join(DATA_DIR, 'store.json')

const zones = new Map()

function nowISO() {
  return new Date().toISOString()
}

function _makeDefaultZone(zoneId, name) {
  return {
    zoneId,
    name: name || zoneId,
    currentTemp: null,
    humidity: null,
    status: 'off',
    online: false,
    lastSeen: null,
    settings: {
      targetTemp: null,
      mode: 'off',
      hold: false,
      scheduleEnabled: false
    },
    pending: {
      settings: null,
      commands: []
    },
    schedule: null
  }
}

function _serialize() {
  return {
    zones: Array.from(zones.values())
  }
}

async function saveToDisk() {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true })
    await fsp.writeFile(STORE_PATH, JSON.stringify(_serialize(), null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to save store to disk:', err)
  }
}

function _loadFromDiskSync() {
  try {
    if (!fs.existsSync(STORE_PATH)) return { zones: [] }
    const raw = fs.readFileSync(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed || { zones: [] }
  } catch (err) {
    console.error('Failed to load store from disk:', err)
    return { zones: [] }
  }
}

function getRawStore() {
  return _serialize()
}

function reloadFromDisk() {
  const parsed = _loadFromDiskSync()
  zones.clear()
  if (parsed && Array.isArray(parsed.zones)) {
    for (const z of parsed.zones) zones.set(z.zoneId, z)
  }
  return getRawStore()
}

function replaceStore(obj) {
  try {
    zones.clear()
    if (obj && Array.isArray(obj.zones)) {
      for (const z of obj.zones) zones.set(z.zoneId, z)
    }
    // persist
    saveToDisk()
    return getRawStore()
  } catch (err) {
    console.error('Failed to replace store:', err)
    throw err
  }
}

function _loadSync() {
  try {
    if (!fs.existsSync(STORE_PATH)) return
    const raw = fs.readFileSync(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.zones)) {
      for (const z of parsed.zones) {
        zones.set(z.zoneId, z)
      }
    }
  } catch (err) {
    console.error('Failed to load store from disk:', err)
  }
}

// initialise from disk synchronously during require
_loadSync()

// Zones should be edited directly in `data/store.json` when needed.
// Previously the server seeded from `data/zones.json`; that behavior was
// removed to avoid duplication and configuration drift.

function listZones() {
  return Array.from(zones.values()).map(z => ({
    zoneId: z.zoneId,
    name: z.name,
    currentTemp: z.currentTemp,
    humidity: z.humidity,
    hvacState: z.status,
    fanState: 'auto',
    online: z.online,
    lastSeen: z.lastSeen
  }))
}

function createZone(zoneId, name) {
  if (zones.has(zoneId)) return null
  const z = _makeDefaultZone(zoneId, name)
  zones.set(zoneId, z)
  // persist
  saveToDisk()
  return z
}

function deleteZone(zoneId) {
  const ok = zones.delete(zoneId)
  if (ok) saveToDisk()
  return ok
}

function getZone(zoneId) {
  return zones.get(zoneId) || null
}

function updateZoneStatus(zoneId, { currentTemp, humidity, status, timestamp }) {
  const z = zones.get(zoneId)
  if (!z) return null
  if (typeof currentTemp === 'number') z.currentTemp = currentTemp
  if (typeof humidity === 'number') z.humidity = humidity
  if (typeof status === 'string') z.status = status
  z.online = true
  z.lastSeen = timestamp || nowISO()
  saveToDisk()
  return { received: true }
}

function getAndClearPendingUpdates(zoneId) {
  const z = zones.get(zoneId)
  if (!z) return null
  const out = {
    hasPendingUpdates: Boolean(z.pending.settings || (z.pending.commands && z.pending.commands.length > 0)),
    settings: z.pending.settings,
    commands: z.pending.commands || []
  }
  // clear pending
  z.pending = { settings: null, commands: [] }
  saveToDisk()
  return out
}

function getSettings(zoneId) {
  const z = zones.get(zoneId)
  if (!z) return null
  return z.settings
}

function updateSettings(zoneId, partial) {
  const z = zones.get(zoneId)
  if (!z) return null
  z.settings = Object.assign({}, z.settings || {}, partial)
  // queue to pending so client receives on next updates fetch
  z.pending.settings = z.settings
  saveToDisk()
  return z.settings
}

function getSchedule(zoneId) {
  const z = zones.get(zoneId)
  if (!z) return null
  return z.schedule
}

function putSchedule(zoneId, schedule) {
  const z = zones.get(zoneId)
  if (!z) return null
  z.schedule = schedule
  saveToDisk()
  return z.schedule
}

function queueCommand(zoneId, cmd) {
  const z = zones.get(zoneId)
  if (!z) return null
  z.pending.commands = z.pending.commands || []
  z.pending.commands.push(cmd)
  saveToDisk()
  return z.pending.commands
}

function getSystemInfo() {
  return {
    serverVersion: '0.1.0',
    temperatureUnit: 'celsius',
    heartbeatIntervalSeconds: 30,
    totalZones: zones.size,
    uptime: '0s'
  }
}

function health() {
  return { status: 'ok' }
}

module.exports = {
  // zones
  listZones,
  createZone,
  deleteZone,
  getZone,
  // status/update flow
  updateZoneStatus,
  getAndClearPendingUpdates,
  // settings
  getSettings,
  updateSettings,
  // schedule
  getSchedule,
  putSchedule,
  // commands
  queueCommand,
  // system
  getSystemInfo,
  health,
  // for tests/debug
  _saveToDisk: saveToDisk,
  _storePath: STORE_PATH
  ,
  // admin helpers
  getRawStore,
  reloadFromDisk,
  replaceStore
}
