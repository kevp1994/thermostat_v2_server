const store = require('../../../../lib/dataStore')

function error(res, status, message, code) {
  res.status(status).json({ error: message, code })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const system = await store.getSystem()
    return res.status(200).json({ systemEnabled: system?.enabled !== false })
  } catch (err) {
    console.error('getSystem error', err)
    return res.status(500).json({ ok: false, message: 'Failed to read system flag' })
  }
}
