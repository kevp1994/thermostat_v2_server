const store = require('../../../../lib/dataStore')

function error(res, status, message, code) {
  res.status(status).json({ error: message, code })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { enabled } = req.body || {}
  if (typeof enabled !== 'boolean') return error(res, 400, 'enabled (boolean) required', 'BAD_BODY')

  try {
    const out = await store.setSystemEnabled(enabled)
    const system = await store.getSystem()
    return res.status(200).json({ ok: true, updated: out.length, systemEnabled: system?.enabled !== false })
  } catch (err) {
    console.error('setSystemEnabled error', err)
    return res.status(500).json({ ok: false, message: 'Failed to update system' })
  }
}
