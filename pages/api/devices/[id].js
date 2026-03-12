const { getDevice, setDevice } = require('../../../lib/dataStore')

export default async function handler(req, res) {
  const { id } = req.query

  if (!id) {
    res.status(400).json({ error: 'Missing device id' })
    return
  }

  if (req.method === 'GET') {
    const data = getDevice(id)
    if (!data) return res.status(404).json({ error: 'Device not found' })
    return res.status(200).json({ id, ...data })
  }

  if (req.method === 'POST') {
    const { temperature, mode, timestamp } = req.body || {}
    if (typeof temperature !== 'number') {
      return res.status(400).json({ error: 'temperature must be a number' })
    }
    if (typeof mode !== 'string') {
      return res.status(400).json({ error: 'mode must be a string' })
    }

    const record = setDevice(id, { temperature, mode, timestamp: timestamp || new Date().toISOString() })
    return res.status(200).json({ id, ...record })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end('Method Not Allowed')
}
