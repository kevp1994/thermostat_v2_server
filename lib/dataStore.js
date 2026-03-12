// Neon Postgres Persistent datastore for v1 API
const { neon } = require('@neondatabase/serverless');

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }
  return neon(process.env.DATABASE_URL);
}

function nowISO() {
  return new Date().toISOString()
}

async function listZones() {
  const sql = getSql();
  const zones = await sql`SELECT * FROM zones ORDER BY zone_id ASC`;
  return zones.map(z => ({
    zoneId: z.zone_id,
    name: z.name,
    currentTemp: z.current_temp,
    humidity: z.humidity,
    hvacState: z.status,
    fanState: 'auto',
    online: z.online,
    lastSeen: z.last_seen
  }));
}

async function createZone(zoneId, name) {
  const sql = getSql();
  const existing = await sql`SELECT 1 FROM zones WHERE zone_id = ${zoneId}`;
  if (existing.length > 0) return null;
  
  await sql`
    INSERT INTO zones (zone_id, name)
    VALUES (${zoneId}, ${name || zoneId})
  `;
  return await getZone(zoneId);
}

async function deleteZone(zoneId) {
  const sql = getSql();
  const res = await sql`DELETE FROM zones WHERE zone_id = ${zoneId} RETURNING 1`;
  return res.length > 0;
}

async function getZone(zoneId) {
  const sql = getSql();
  const res = await sql`SELECT * FROM zones WHERE zone_id = ${zoneId}`;
  if (res.length === 0) return null;
  
  const z = res[0];
  return {
    zoneId: z.zone_id,
    name: z.name,
    currentTemp: z.current_temp,
    humidity: z.humidity,
    status: z.status,
    online: z.online,
    lastSeen: z.last_seen,
    settings: z.settings,
    pending: z.pending,
    schedule: z.schedule
  };
}

async function updateZoneStatus(zoneId, { currentTemp, humidity, status, timestamp }) {
  const sql = getSql();
  const existing = await sql`SELECT 1 FROM zones WHERE zone_id = ${zoneId}`;
  if (existing.length === 0) return null;

  const current_temp = typeof currentTemp === 'number' ? currentTemp : null;
  const hum = typeof humidity === 'number' ? humidity : null;
  const stat = typeof status === 'string' ? status : null;
  const ts = timestamp || nowISO();

  // Dynamically build the update
  await sql`
    UPDATE zones 
    SET 
      current_temp = COALESCE(${current_temp}, current_temp),
      humidity = COALESCE(${hum}, humidity),
      status = COALESCE(${stat}, status),
      online = true,
      last_seen = ${ts}::timestamp
    WHERE zone_id = ${zoneId}
  `;
  return { received: true };
}

async function getAndClearPendingUpdates(zoneId) {
  const sql = getSql();
  const res = await sql`SELECT pending FROM zones WHERE zone_id = ${zoneId}`;
  if (res.length === 0) return null;

  const pending = res[0].pending || { settings: null, commands: [] };
  const hasUpdates = Boolean(pending.settings || (pending.commands && pending.commands.length > 0));
  
  const out = {
    hasPendingUpdates: hasUpdates,
    settings: pending.settings,
    commands: pending.commands || []
  };

  // clear pending
  await sql`
    UPDATE zones 
    SET pending = '{"settings": null, "commands": []}'::jsonb 
    WHERE zone_id = ${zoneId}
  `;
  
  return out;
}

async function getSettings(zoneId) {
  const sql = getSql();
  const res = await sql`SELECT settings FROM zones WHERE zone_id = ${zoneId}`;
  if (res.length === 0) return null;
  return res[0].settings;
}

async function updateSettings(zoneId, partial) {
  const sql = getSql();
  const res = await sql`SELECT settings, pending FROM zones WHERE zone_id = ${zoneId}`;
  if (res.length === 0) return null;

  const currentSettings = res[0].settings || {};
  const currentPending = res[0].pending || { settings: null, commands: [] };
  
  const newSettings = { ...currentSettings, ...partial };
  currentPending.settings = newSettings;

  await sql`
    UPDATE zones 
    SET 
      settings = ${newSettings}::jsonb,
      pending = ${currentPending}::jsonb
    WHERE zone_id = ${zoneId}
  `;
  
  return newSettings;
}

async function getSchedule(zoneId) {
  const sql = getSql();
  const res = await sql`SELECT schedule FROM zones WHERE zone_id = ${zoneId}`;
  if (res.length === 0) return null;
  return res[0].schedule;
}

async function putSchedule(zoneId, schedule) {
  const sql = getSql();
  const res = await sql`SELECT 1 FROM zones WHERE zone_id = ${zoneId}`;
  if (res.length === 0) return null;

  await sql`
    UPDATE zones 
    SET schedule = ${schedule ? JSON.stringify(schedule) : null}::jsonb
    WHERE zone_id = ${zoneId}
  `;
  return schedule;
}

async function queueCommand(zoneId, cmd) {
  const sql = getSql();
  const res = await sql`SELECT pending FROM zones WHERE zone_id = ${zoneId}`;
  if (res.length === 0) return null;

  const pending = res[0].pending || { settings: null, commands: [] };
  if (!pending.commands) pending.commands = [];
  pending.commands.push(cmd);

  await sql`
    UPDATE zones 
    SET pending = ${pending}::jsonb
    WHERE zone_id = ${zoneId}
  `;
  return pending.commands;
}

async function getSystemInfo() {
  const sql = getSql();
  const countRes = await sql`SELECT count(*) FROM zones`;
  return {
    serverVersion: '0.1.0',
    temperatureUnit: 'celsius',
    heartbeatIntervalSeconds: 30,
    totalZones: parseInt(countRes[0].count, 10),
    database: 'neon_postgres',
    uptime: '0s'
  };
}

async function health() {
  const sql = getSql();
  await sql`SELECT 1`;
  return { status: 'ok', database: 'connected' };
}

async function getRawStore() {
  const sql = getSql();
  const zones = await sql`SELECT * FROM zones`;
  return { zones };
}

async function reloadFromDisk() {
  return await getRawStore();
}

async function replaceStore(obj) {
  const sql = getSql();
  if (obj && Array.isArray(obj.zones)) {
    // Clear and insert
    await sql`DELETE FROM zones`;
    for (const z of obj.zones) {
      await sql`
        INSERT INTO zones (zone_id, name, current_temp, humidity, status, online, last_seen, settings, pending, schedule)
        VALUES (${z.zone_id || z.zoneId}, ${z.name}, ${z.current_temp || z.currentTemp}, ${z.humidity}, ${z.status}, ${z.online}, ${z.last_seen || z.lastSeen ? new Date(z.last_seen || z.lastSeen) : null}, ${z.settings}::jsonb, ${z.pending}::jsonb, ${z.schedule}::jsonb)
      `;
    }
  }
  return await getRawStore();
}

module.exports = {
  listZones,
  createZone,
  deleteZone,
  getZone,
  updateZoneStatus,
  getAndClearPendingUpdates,
  getSettings,
  updateSettings,
  getSchedule,
  putSchedule,
  queueCommand,
  getSystemInfo,
  health,
  getRawStore,
  reloadFromDisk,
  replaceStore
};
