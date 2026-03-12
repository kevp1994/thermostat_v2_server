const store = require('../../../../../lib/dataStore')

function error(res, status, message, code) {
  res.status(status).json({ error: message, code })
}

export default async function handler(req, res) {
  const { zoneId } = req.query
  if (!zoneId) return error(res, 400, 'zoneId required', 'BAD_ZONE_ID')

  if (req.method === 'GET') {
    const settings = await store.getSettings(zoneId)
    if (settings === null) return error(res, 404, 'Zone not found', 'NOT_FOUND')
    return res.status(200).json(settings)
  }

  if (req.method === 'PUT') {
    const partial = req.body || {}
    const updated = await store.updateSettings(zoneId, partial)
    if (updated === null) return error(res, 404, 'Zone not found', 'NOT_FOUND')
    return res.status(200).json(updated)
  }

  res.setHeader('Allow', ['GET', 'PUT'])
  res.status(405).end('Method Not Allowed')
}
