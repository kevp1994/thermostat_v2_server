const store = require('../../lib/dataStore')

function error(res, status, message, code) {
  res.status(status).json({ error: message, code })
}

// Legacy convenience endpoint to get/set a zone's `targetTemp`.
// Use query `?zoneId=zone-1` or include `{ "zoneId": "zone-1" }` in POST body.
export default function handler(req, res) {
  if (req.method === 'GET') {
    const { zoneId } = req.query
    if (!zoneId) return error(res, 400, 'zoneId query required', 'BAD_ZONE_ID')
    const settings = store.getSettings(zoneId)
    if (!settings) return error(res, 404, 'Zone not found', 'NOT_FOUND')
    return res.status(200).json({ target: settings.targetTemp })
  }

  if (req.method === 'POST') {
    const { target, zoneId } = req.body || {}
    const zid = zoneId || (req.query && req.query.zoneId)
    if (!zid) return error(res, 400, 'zoneId required in body or query', 'BAD_ZONE_ID')
    if (typeof target !== 'number') return error(res, 400, 'target must be a number', 'BAD_BODY')
    const updated = store.updateSettings(zid, { targetTemp: target })
    if (!updated) return error(res, 404, 'Zone not found', 'NOT_FOUND')
    return res.status(200).json({ target: updated.targetTemp })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end('Method Not Allowed')
}
