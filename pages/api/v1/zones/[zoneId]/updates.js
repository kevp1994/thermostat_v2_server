const store = require('../../../../../lib/dataStore')

function error(res, status, message, code) {
  res.status(status).json({ error: message, code })
}

export default async function handler(req, res) {
  const { zoneId } = req.query
  if (!zoneId) return error(res, 400, 'zoneId required', 'BAD_ZONE_ID')

  if (req.method === 'GET') {
    const z = await store.getZone(zoneId)
    if (!z) return error(res, 404, 'Zone not found', 'NOT_FOUND')
    const updates = await store.getAndClearPendingUpdates(zoneId)
    // Include global system enabled flag so devices can decide to do nothing when disabled
    const system = await store.getSystem()
    const out = { ...updates, systemEnabled: system?.enabled !== false }
    return res.status(200).json(out)
  }

  res.setHeader('Allow', ['GET'])
  res.status(405).end('Method Not Allowed')
}
