const store = require('../../../../../lib/dataStore')

function adminKeyMatches(req) {
  const key = process.env.ADMIN_KEY
  if (!key) return false
  const header = req.headers['x-admin-key'] || req.query.key
  return header === key
}

export default function handler(req, res) {
  if (!adminKeyMatches(req)) {
    return res.status(403).json({ error: 'Admin key required', code: 'FORBIDDEN' })
  }

  if (req.method === 'GET') {
    const raw = store.getRawStore()
    return res.status(200).json(raw)
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    const action = body.action || req.query.action
    if (action === 'reload') {
      const reloaded = store.reloadFromDisk()
      return res.status(200).json({ reloaded })
    }
    if (action === 'replace') {
      const newStore = body.store
      if (!newStore) return res.status(400).json({ error: 'store body required for replace', code: 'BAD_BODY' })
      const replaced = store.replaceStore(newStore)
      return res.status(200).json({ replaced })
    }
    return res.status(400).json({ error: 'action required: reload|replace', code: 'BAD_ACTION' })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end('Method Not Allowed')
}
