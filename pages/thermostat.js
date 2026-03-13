import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { Calendar as CalendarIcon, Flame, Power, Thermometer, Droplets, RefreshCw } from 'lucide-react'

export default function ThermostatPage() {
  const [zones, setZones] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [zone, setZone] = useState(null)
  const [settings, setSettings] = useState(null)
  const [systemEnabled, setSystemEnabled] = useState(true)
  const [schedule, setSchedule] = useState(null)

  // Polling mechanism
  useEffect(() => {
    fetchZones()
    fetchSystem()
    
    // Poll for current zone status every 5 seconds
    const interval = setInterval(() => {
      if (selectedZoneId) {
        fetchZone(selectedZoneId)
        fetchSettingsSilent(selectedZoneId)
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }, [selectedZoneId])

  useEffect(() => {
    if (!selectedZoneId) return
    fetchZone(selectedZoneId)
    fetchSettings(selectedZoneId)
    fetchSystem()
    // fetchSchedule(selectedZoneId) // left for future expansion
  }, [selectedZoneId])

  async function fetchSystem() {
    try {
      const res = await fetch('/api/v1/system')
      if (!res.ok) return
      const json = await res.json()
      setSystemEnabled(json?.systemEnabled !== false)
    } catch (err) {
      // ignore
    }
  }

  async function fetchZones() {
    try {
      const res = await fetch('/api/v1/zones')
      const json = await res.json()
      setZones(json)
      if (!selectedZoneId && json.length > 0) setSelectedZoneId(json[0].zoneId)
    } catch (err) {
      console.error('Failed to load zones:', err)
    }
  }

  async function fetchZone(id) {
    try {
      const res = await fetch(`/api/v1/zones/${encodeURIComponent(id)}`)
      if (!res.ok) { setZone(null); return }
      const json = await res.json()
      setZone(json)
    } catch (err) {
      console.error('Failed to load zone:', err)
    }
  }

  async function fetchSettings(id) {
    try {
      const res = await fetch(`/api/v1/zones/${encodeURIComponent(id)}/settings`)
      if (!res.ok) { setSettings(null); return }
      const json = await res.json()
      setSettings(json)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  async function fetchSettingsSilent(id) {
    try {
      const res = await fetch(`/api/v1/zones/${encodeURIComponent(id)}/settings`)
      if (!res.ok) return
      const json = await res.json()
      setSettings(prev => ({...prev, ...json}))
    } catch (err) {
      // quiet
    }
  }

  async function performSettingUpdate(updates) {
    if (!selectedZoneId) return
    
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings) // Optimistic update
    
    try {
      const res = await fetch(`/api/v1/zones/${encodeURIComponent(selectedZoneId)}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })
      if (!res.ok) {
        // Revert on failure
        fetchSettings(selectedZoneId)
      }
    } catch (err) {
      console.error('Save settings error:', err)
      fetchSettings(selectedZoneId)
    }
  }

  async function toggleMode() {
    // Toggle the system enabled flag instead of changing mode to 'off'.
    // Mode remains the user's preferred intent (e.g. 'heat'), while `enabled`
    // controls whether the HVAC may run.
    const currentlyEnabled = settings?.enabled !== false
    const newEnabled = !currentlyEnabled
    // Optimistic updates: update local settings and global flag immediately
    performSettingUpdate({ enabled: newEnabled })
    setSystemEnabled(newEnabled)

    // If we're disabling the system, also post an immediate status update
    // so the server's zone status reflects the disabled state right away.
    if (!newEnabled && selectedZoneId) {
      try {
        await fetch(`/api/v1/zones/${encodeURIComponent(selectedZoneId)}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentTemp: zone?.currentTemp ? Number(zone.currentTemp) : 0,
            humidity: zone?.humidity ? Number(zone.humidity) : 0,
            status: 'off',
            timestamp: new Date().toISOString()
          })
        })
        fetchZone(selectedZoneId)
      } catch (err) {
        console.error('Failed to post status update:', err)
      }
    }

    // Also update the global system flag so `systemEnabled` in device updates
    // reflects the user's action. Update local `systemEnabled` immediately
    // so the UI indicator changes without waiting for network roundtrips.
    try {
      const res = await fetch('/api/v1/system/power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled })
      })
      if (!res.ok) {
        // revert optimistic change
        setSystemEnabled(!newEnabled)
      }
      // refresh pending/updates for the selected zone so devices see it
      if (selectedZoneId) {
        await fetch(`/api/v1/zones/${encodeURIComponent(selectedZoneId)}/updates`)
        fetchZone(selectedZoneId)
        fetchSettingsSilent(selectedZoneId)
      }
    } catch (err) {
      console.error('Failed to update global system flag:', err)
    }
  }

  function toggleSchedule() {
    performSettingUpdate({ scheduleEnabled: !settings?.scheduleEnabled })
  }

  function adjustTemp(amount) {
    const currentTarget = settings?.targetTemp || 18.0
    performSettingUpdate({ targetTemp: currentTarget + amount, hold: true })
  }

  // Format the current temp robustly with 1 decimal place (0.5 degree steps)
  const currentTempFormat = zone?.currentTemp ? Number(zone.currentTemp).toFixed(1) : '--'
  const targetTemp = settings?.targetTemp ? Number(settings.targetTemp).toFixed(1) : '--'
  const enabled = systemEnabled && (settings?.enabled !== false)
  const isOff = !enabled || settings?.mode === 'off'

  // Status and Glow Logic
  let uiStatus = 'Loading'
  let glowClass = 'bg-transparent'

  const currentT = zone?.currentTemp
  const targetT = settings?.targetTemp

  if (isOff) {
    uiStatus = 'System Off'
    glowClass = 'bg-gray-600'
  } else if (zone?.status === 'heating' || (currentT && targetT && targetT > currentT)) {
    uiStatus = 'Heating'
    glowClass = 'bg-orange-600'
  } else if (currentT && targetT && targetT < currentT) {
    uiStatus = 'Standby (Cooling)'
    glowClass = 'bg-blue-400'
  } else if (currentT && targetT && targetT === currentT) {
    uiStatus = 'At Target'
    glowClass = 'bg-transparent' 
  } else {
    uiStatus = 'Idle'
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <title>Thermostat</title>
      </Head>
      <div className="fixed inset-0 bg-gray-900 text-white flex flex-col items-center px-4 pt-[max(env(safe-area-inset-top),2rem)] pb-[max(env(safe-area-inset-bottom),2rem)] font-sans justify-center select-none overflow-hidden overscroll-none touch-manipulation">
        
        {/* Top Bar with Selector */}
      <div className="max-w-md w-full mb-8 flex justify-between items-center bg-gray-800 p-4 rounded-2xl shadow-lg border border-gray-700">
        <div className="flex items-center space-x-3">
          <Thermometer className="text-orange-500" />
          <select 
            className="bg-gray-800 text-white border-none text-lg font-medium focus:ring-0 cursor-pointer outline-none"
            value={selectedZoneId} 
            onChange={e => setSelectedZoneId(e.target.value)}
          >
            {zones.map(z => (
              <option key={z.zoneId} value={z.zoneId}>{z.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-4 text-gray-400">
          <div className="flex flex-col items-center justify-center">
             <Droplets size={16} />
             <span className="text-xs mt-1">{zone?.humidity ? Math.round(zone.humidity) + '%' : '--%'}</span>
          </div>
          <div className="flex flex-col items-center justify-center relative">
             <RefreshCw size={16} className={zone?.online ? "text-green-500" : "text-gray-500"} />
             <span className="text-xs mt-1">{zone?.online ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Main Thermostat Dial */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 bg-gray-800 rounded-full flex items-center justify-center shadow-2xl border-4 border-gray-700 transition-all duration-500">
        
        {/* Glow effect based on state */}
        <div className={`absolute inset-0 rounded-full blur-xl transition-colors duration-1000 opacity-20 ${glowClass}`}></div>

        <div className="z-10 text-center flex flex-col items-center justify-center w-full h-full">
          <p className="text-gray-400 text-sm tracking-widest uppercase mb-1">{uiStatus}</p>
          
          <div className="flex items-start justify-center">
            <span className={`text-7xl md:text-[6rem] leading-none font-bold tracking-tighter ${isOff ? 'text-gray-500' : 'text-white'}`}>
              {currentTempFormat}
            </span>
          </div>

          {!isOff && (
            <div className="mt-4 flex items-center bg-gray-900 rounded-full px-5 py-2 space-x-6 border border-gray-700 shadow-inner">
              <button 
                onClick={() => adjustTemp(-0.5)}
                className="text-2xl text-gray-400 hover:text-white transition-colors pt-0 pb-1 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800"
              >
                -
              </button>
              <div className="flex flex-col items-center min-w-[3rem]">
                <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-0.5">Target</span>
                <span className="text-xl font-bold text-orange-400">{targetTemp}°</span>
              </div>
              <button 
                 onClick={() => adjustTemp(0.5)}
                 className="text-2xl text-gray-400 hover:text-white transition-colors pt-0 pb-1 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="max-w-md w-full mt-12 grid grid-cols-2 gap-4">
        
        <button 
          onClick={toggleMode}
          className={`flex flex-col items-center justify-center py-5 rounded-2xl transition-all duration-300 ${
            (enabled && settings?.mode === 'heat') 
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
          }`}
        >
          {(enabled && settings?.mode === 'heat') ? <Flame size={28} className="mb-2" /> : <Power size={28} className="mb-2" />}
          <span className="text-sm font-medium">{(enabled && settings?.mode === 'heat') ? 'Heat Mode' : (isOff ? 'System Off' : (settings?.mode || 'Mode'))}</span>
        </button>

        <button 
          onClick={toggleSchedule}
          className={`flex flex-col items-center justify-center py-5 rounded-2xl transition-all duration-300 ${
            settings?.scheduleEnabled 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
          }`}
        >
          <CalendarIcon size={28} className="mb-2" />
          <span className="text-sm font-medium">Schedule {settings?.scheduleEnabled ? 'On' : 'Off'}</span>
        </button>

        {settings?.hold && (
           <button 
           onClick={() => performSettingUpdate({ hold: false })}
           className="col-span-2 flex items-center justify-center space-x-2 py-4 rounded-2xl bg-gray-800 text-white border border-gray-600 hover:bg-gray-700 transition-colors mt-2"
         >
           <span className="text-sm font-medium">Resume Schedule (Clear Hold)</span>
         </button>
        )}

      </div>
      
    </div>
    </>
  )
}

// Server-side auth check: redirect to /login when no valid auth cookie
export async function getServerSideProps(ctx) {
  const { req } = ctx
  const cookieHeader = req.headers && req.headers.cookie ? req.headers.cookie : ''

  const hasAuth = cookieHeader.split(';').map(c => c.trim()).some(c => c === 'auth=1')
  if (!hasAuth) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    }
  }

  return { props: {} }
}
