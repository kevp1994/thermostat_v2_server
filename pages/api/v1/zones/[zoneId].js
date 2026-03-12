const store = require('../../../../lib/dataStore')

function error(res, status, message, code) {
  res.status(status).json({ error: message, code })
}

export default async function handler(req, res) {
  const { zoneId } = req.query
  if (!zoneId) return error(res, 400, 'zoneId required', 'BAD_ZONE_ID')

  if (req.method === 'GET') {
    const z = await store.getZone(zoneId)
    if (!z) return error(res, 404, 'Zone not found', 'NOT_FOUND')
    return res.status(200).json(z)
  }

  if (req.method === 'DELETE') {
    const ok = await store.deleteZone(zoneId)
    if (!ok) return error(res, 404, 'Zone not found', 'NOT_FOUND')
    return res.status(204).end()
  }

  res.setHeader('Allow', ['GET', 'DELETE'])
  res.status(405).end('Method Not Allowed')
}
