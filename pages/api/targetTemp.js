const { getTargetTemp, setTargetTemp } = require('../../lib/dataStore')

export default function handler(req, res) {
  if (req.method === 'GET') {
    const t = getTargetTemp()
    return res.status(200).json({ target: t })
  }

  if (req.method === 'POST') {
    const { target } = req.body || {}
    if (typeof target !== 'number') {
      return res.status(400).json({ error: 'target must be a number' })
    }
    setTargetTemp(target)
    return res.status(200).json({ target })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end('Method Not Allowed')
}
