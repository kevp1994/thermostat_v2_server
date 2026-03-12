import React, { useEffect, useState } from 'react'

export default function ThermostatPage() {
  const [zones, setZones] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [zone, setZone] = useState(null)
  const [settings, setSettings] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchZones()
  }, [])

  useEffect(() => {
    if (!selectedZoneId) return
    fetchZone(selectedZoneId)
    fetchSettings(selectedZoneId)
    fetchSchedule(selectedZoneId)
  }, [selectedZoneId])

  async function fetchZones() {
    try {
      const res = await fetch('/api/v1/zones')
      const json = await res.json()
      setZones(json)
      if (!selectedZoneId && json.length > 0) setSelectedZoneId(json[0].zoneId)
    } catch (err) {
      setMessage('Failed to load zones: ' + String(err))
    }
  }

  async function fetchZone(id) {
    try {
      const res = await fetch(`/api/v1/zones/${encodeURIComponent(id)}`)
      if (!res.ok) { setZone(null); return }
      const json = await res.json()
      setZone(json)
    } catch (err) {
      setMessage('Failed to load zone: ' + String(err))
    }
  }

  async function fetchSettings(id) {
    try {
      const res = await fetch(`/api/v1/zones/${encodeURIComponent(id)}/settings`)
      if (!res.ok) { setSettings(null); return }
      const json = await res.json()
      setSettings(json)
    } catch (err) {
      setMessage('Failed to load settings: ' + String(err))
    }
  }

  async function fetchSchedule(id) {
    try {
      const res = await fetch(`/api/v1/zones/${encodeURIComponent(id)}/schedule`)
      if (!res.ok) { setSchedule(null); return }
      const json = await res.json()
      setSchedule(json.schedule ?? json)
    } catch (err) {
      setMessage('Failed to load schedule: ' + String(err))
    }
  }

  async function saveSettings() {
    if (!selectedZoneId || !settings) return
    try {
      const res = await fetch(`/api/v1/zones/${encodeURIComponent(selectedZoneId)}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      const json = await res.json()
      if (!res.ok) setMessage('Save settings failed: ' + JSON.stringify(json))
      else setMessage('Settings saved')
      setSettings(json)
    } catch (err) {
      setMessage('Save settings error: ' + String(err))
    }
  }

  async function saveSchedule() {
    if (!selectedZoneId) return
    try {
      const res = await fetch(`/api/v1/zones/${encodeURIComponent(selectedZoneId)}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule })
      })
      const json = await res.json()
      if (!res.ok) setMessage('Save schedule failed: ' + JSON.stringify(json))
      else setMessage('Schedule saved')
      setSchedule(json.schedule ?? json)
    } catch (err) {
      setMessage('Save schedule error: ' + String(err))
    }
  }

  function updateSettingField(field, value) {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, Arial' }}>
      <h1>Thermostat UI</h1>
      <div>
        <label>Zone: </label>
        <select value={selectedZoneId} onChange={e => setSelectedZoneId(e.target.value)}>
          <option value="">-- select --</option>
          {zones.map(z => <option key={z.zoneId} value={z.zoneId}>{z.name} ({z.zoneId})</option>)}
        </select>
        <button onClick={fetchZones} style={{ marginLeft: 8 }}>Refresh Zones</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h2>Zone Info</h2>
        {zone ? (
          <div>
            <div>ZoneId: {zone.zoneId}</div>
            <div>Name: {zone.name}</div>
            <div>Current Temp: {zone.currentTemp ?? '--'}</div>
            <div>Humidity: {zone.humidity ?? '--'}</div>
            <div>Status: {zone.status}</div>
            <div>Online: {String(zone.online)}</div>
            <div>Last Seen: {zone.lastSeen}</div>
          </div>
        ) : (
          <div>No zone selected or failed to load.</div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <h2>Settings</h2>
        {settings ? (
          <div>
            <div>
              <label>Target Temp: </label>
              <input type="number" value={settings.targetTemp ?? ''} onChange={e => updateSettingField('targetTemp', e.target.value === '' ? null : Number(e.target.value))} />
            </div>
            <div>
              <label>Mode: </label>
              <select value={settings.mode} onChange={e => updateSettingField('mode', e.target.value)}>
                <option value="heat">heat</option>
                <option value="off">off</option>
              </select>
            </div>
            <div>
              <label>Hold: </label>
              <input type="checkbox" checked={Boolean(settings.hold)} onChange={e => updateSettingField('hold', e.target.checked)} />
            </div>
            <div>
              <label>Schedule Enabled: </label>
              <input type="checkbox" checked={Boolean(settings.scheduleEnabled)} onChange={e => updateSettingField('scheduleEnabled', e.target.checked)} />
            </div>
            <div style={{ marginTop: 8 }}>
              <button onClick={saveSettings}>Save Settings</button>
            </div>
          </div>
        ) : (
          <div>Settings not available.</div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <h2>Schedule (JSON)</h2>
        <div>
          <textarea value={schedule ? JSON.stringify(schedule, null, 2) : ''} onChange={e => {
            try {
              const parsed = JSON.parse(e.target.value)
              setSchedule(parsed)
            } catch (err) {
              // keep raw text until valid JSON
              setSchedule(e.target.value)
            }
          }} rows={10} cols={80} />
        </div>
        <div style={{ marginTop: 8 }}>
          <button onClick={saveSchedule}>Save Schedule</button>
        </div>
      </div>

      <div style={{ marginTop: 16, color: 'green' }}>{message}</div>
    </div>
  )
}
