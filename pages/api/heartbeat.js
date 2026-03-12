export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ status: 'ok', time: new Date().toISOString() })
    return
  }
  res.setHeader('Allow', ['GET'])
  res.status(405).end('Method Not Allowed')
}
