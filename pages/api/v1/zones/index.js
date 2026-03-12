const store = require('../../../../lib/dataStore')

function error(res, status, message, code) {
  res.status(status).json({ error: message, code })
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const list = await store.listZones()
    return res.status(200).json(list)
  }

  // Zone creation is intentionally not exposed via API. Zones are configured
  // via `data/zones.json` (or `data/await store.json`) and the server must be
  // restarted after making changes.
  res.setHeader('Allow', ['GET'])
  return res.status(405).json({ error: 'Zone creation via API is disabled', code: 'DISABLED' })
}
