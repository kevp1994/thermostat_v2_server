const store = require('../../../../../lib/dataStore')

function error(res, status, message, code) {
  res.status(status).json({ error: message, code })
}

export default function handler(req, res) {
  const { zoneId } = req.query
  if (!zoneId) return error(res, 400, 'zoneId required', 'BAD_ZONE_ID')

  if (req.method === 'GET') {
    const schedule = store.getSchedule(zoneId)
    if (schedule === null) return error(res, 404, 'Zone not found', 'NOT_FOUND')
    return res.status(200).json({ zoneId, schedule })
  }

  if (req.method === 'PUT') {
    const body = req.body || {}
    const updated = store.putSchedule(zoneId, body.schedule || null)
    if (updated === null) return error(res, 404, 'Zone not found', 'NOT_FOUND')
    return res.status(200).json({ zoneId, schedule: updated })
  }

  res.setHeader('Allow', ['GET', 'PUT'])
  res.status(405).end('Method Not Allowed')
}
