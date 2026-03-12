const store = require('../../../../../lib/dataStore')

function error(res, status, message, code) {
  res.status(status).json({ error: message, code })
}

export default function handler(req, res) {
  const { zoneId } = req.query
  if (!zoneId) return error(res, 400, 'zoneId required', 'BAD_ZONE_ID')

  if (req.method === 'GET') {
    const z = store.getZone(zoneId)
    if (!z) return error(res, 404, 'Zone not found', 'NOT_FOUND')
    const updates = store.getAndClearPendingUpdates(zoneId)
    return res.status(200).json(updates)
  }

  res.setHeader('Allow', ['GET'])
  res.status(405).end('Method Not Allowed')
}
