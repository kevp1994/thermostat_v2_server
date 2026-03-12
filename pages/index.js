import React, { useEffect, useState } from 'react'

export default function Home() {
  const [target, setTarget] = useState(null)

  useEffect(() => {
    let mounted = true

    async function fetchTarget() {
      try {
        const res = await fetch('/api/targetTemp')
        if (!mounted) return
        const json = await res.json()
        setTarget(json.target ?? null)
      } catch (err) {
        // ignore
      }
    }

    fetchTarget()
    const id = setInterval(fetchTarget, 1000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, Arial' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: 16 }}>Target Temperature</h1>
        <div style={{ fontSize: 72, fontWeight: 700 }}>
          {target === null ? '--' : target}
        </div>
      </div>
    </div>
  )
}
