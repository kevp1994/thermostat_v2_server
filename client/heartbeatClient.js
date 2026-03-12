// Usage: node client/heartbeatClient.js <zoneId> <serverUrl> [intervalSec]
// Example: node client/heartbeatClient.js zone-1 http://localhost:3000 30
// Requires Node 18+ (native fetch) or run with a fetch polyfill.

const zoneId = process.argv[2] || 'zone-1'
const server = process.argv[3] || 'http://localhost:3000'
const intervalSec = Number(process.argv[4] ?? 10)

const baselineTemp = Number(process.env.BASELINE_TEMP ?? 21.5)
const baselineHumidity = Number(process.env.BASELINE_HUMIDITY ?? 45)

async function ensureZone() {
  // Zone creation via API is disabled. Check zone exists and warn if not.
  const url = `${server}/api/v1/zones/${encodeURIComponent(zoneId)}`
  try {
    const res = await fetch(url)
    if (res.status === 404) {
      console.error(`Zone ${zoneId} not found on server. Configure it via data/zones.json and restart the server.`)
      process.exit(1)
    }
  } catch (err) {
    console.error('ensureZone lookup error', err)
    process.exit(1)
  }
}

function randomDelta(mag = 0.5) {
  return (Math.random() * 2 - 1) * mag
}

async function heartbeatOnce() {
  const statusUrl = `${server}/api/v1/zones/${encodeURIComponent(zoneId)}/status`
  const updatesUrl = `${server}/api/v1/zones/${encodeURIComponent(zoneId)}/updates`

  const payload = {
    currentTemp: Math.round((baselineTemp + randomDelta(0.7)) * 10) / 10,
    humidity: Math.round((baselineHumidity + randomDelta(2)) * 10) / 10,
    status: 'idle',
    timestamp: new Date().toISOString()
  }

  try {
    const res = await fetch(statusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const body = await res.json().catch(() => null)
    console.log(new Date().toISOString(), 'POST status ->', res.status, body)
  } catch (err) {
    console.error('POST error', err)
  }

  try {
    const r2 = await fetch(updatesUrl)
    const updates = await r2.json().catch(() => null)
    console.log(new Date().toISOString(), 'GET updates ->', r2.status, updates)
  } catch (err) {
    console.error('GET updates error', err)
  }
}

async function run() {
  await ensureZone()
  if (!intervalSec || intervalSec <= 0) {
    await heartbeatOnce()
    return
  }

  console.log(`Starting heartbeat for ${zoneId} -> ${server} every ${intervalSec}s`)
  await heartbeatOnce()
  setInterval(() => {
    heartbeatOnce().catch(err => console.error('heartbeat error', err))
  }, intervalSec * 1000)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
