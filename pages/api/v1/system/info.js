const store = require('../../../../lib/dataStore')

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end('Method Not Allowed')
  }
  const info = store.getSystemInfo()
  return res.status(200).json(info)
}
