import React, { useEffect, useState } from 'react'

const ENDPOINTS = [
  { key: 'zones', label: 'List Zones', path: '/api/v1/zones' },
  { key: 'createZone', label: 'Create Zone (example)', path: '/api/v1/zones' },
  { key: 'zone', label: 'Zone (zone-1)', path: '/api/v1/zones/zone-1' },
  { key: 'status', label: 'Zone Status (POST)', path: '/api/v1/zones/zone-1/status' },
  { key: 'updates', label: 'Zone Updates', path: '/api/v1/zones/zone-1/updates' },
  { key: 'settings', label: 'Zone Settings', path: '/api/v1/zones/zone-1/settings' },
  { key: 'schedule', label: 'Zone Schedule', path: '/api/v1/zones/zone-1/schedule' },
  { key: 'systemInfo', label: 'System Info', path: '/api/v1/system/info' },
  { key: 'systemHealth', label: 'System Health', path: '/api/v1/system/health' },
  { key: 'targetTemp', label: 'Legacy Target Temp (zone-1)', path: '/api/targetTemp?zoneId=zone-1' },
  { key: 'heartbeat', label: 'Legacy Heartbeat', path: '/api/heartbeat' }
]

function pretty(v) {
  try {
    return JSON.stringify(v, null, 2)
  } catch (e) {
    return String(v)
  }
}

export default function EndpointsPage() {
  const [results, setResults] = useState({})

  useEffect(() => {
    let mounted = true

    async function poll() {
      const next = {}
      await Promise.all(ENDPOINTS.map(async (ep) => {
        try {
          // Use GET for all; POST endpoints will return 405 which is useful to see
          const res = await fetch(ep.path)
          const text = await res.text()
          let json = null
          try { json = JSON.parse(text) } catch (e) { json = text }
          next[ep.key] = { status: res.status, ok: res.ok, data: json, lastFetched: new Date().toISOString() }
        } catch (err) {
          next[ep.key] = { status: 0, ok: false, error: String(err), lastFetched: new Date().toISOString() }
        }
      }))
      if (!mounted) return
      setResults(next)
    }

    poll()
    const id = setInterval(poll, 2000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, Arial' }}>
      <h1>Server Endpoints</h1>
      <p>Polling every 2s. Shows status and response (JSON or text).</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
        {ENDPOINTS.map(ep => {
          const r = results[ep.key]
          return (
            <div key={ep.key} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
              <div style={{ fontWeight: 600 }}>{ep.label}</div>
              <div style={{ color: '#555', marginBottom: 6 }}>{ep.path}</div>
              {r ? (
                <div style={{ fontSize: 13 }}>
                  <div><strong>Status:</strong> {r.status} {r.ok ? 'OK' : ''}</div>
                  <div style={{ marginTop: 8 }}>
                    <pre style={{ whiteSpace: 'pre-wrap', background: '#f7f7f7', padding: 8, borderRadius: 4, maxHeight: 240, overflow: 'auto' }}>{pretty(r.data ?? r.error)}</pre>
                    <div style={{ color: '#888', marginTop: 6 }}>Last: {r.lastFetched}</div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#999' }}>Loading…</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
