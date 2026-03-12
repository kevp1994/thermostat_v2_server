// Usage: node client/heartbeatClient.js <deviceId> <serverUrl>
// Requires Node 18+ (native fetch) or run with a fetch polyfill.
const deviceId = process.argv[2] || 'device-123'
const server = process.argv[3] || 'http://localhost:3000'

async function sendHeartbeat() {
  const url = `${server}/api/devices/${encodeURIComponent(deviceId)}`
  const payload = {
    temperature: 21.5,
    mode: 'auto',
    timestamp: new Date().toISOString()
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const body = await res.json().catch(() => null)
  console.log('status:', res.status)
  console.log('response:', body)
}

sendHeartbeat().catch(err => {
  console.error(err)
  process.exit(1)
})
