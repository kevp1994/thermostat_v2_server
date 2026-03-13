const store = require('../../../../../lib/dataStore')

function error(res, status, message, code) {
  res.status(status).json({ error: message, code })
}

export default async function handler(req, res) {
  const { zoneId } = req.query
  if (!zoneId) return error(res, 400, 'zoneId required', 'BAD_ZONE_ID')

  if (req.method === 'POST') {
    const { currentTemp, humidity, status, timestamp } = req.body || {}
    if (typeof currentTemp !== 'number' || typeof status !== 'string' || typeof timestamp !== 'string') {
      return error(res, 400, 'Invalid body: currentTemp (number), status (string), timestamp (string) required', 'BAD_BODY')
    }
    const z = await store.getZone(zoneId)
    if (!z) return error(res, 404, 'Zone not found', 'NOT_FOUND')
    const result = await store.updateZoneStatus(zoneId, { currentTemp, humidity, status, timestamp })
    // include the global systemEnabled flag so device gets authoritative power state
    const system = await store.getSystem()
    return res.status(200).json({ ...result, systemEnabled: system?.enabled !== false })
  }

  res.setHeader('Allow', ['POST'])
  res.status(405).end('Method Not Allowed')
}
