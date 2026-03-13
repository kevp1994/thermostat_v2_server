export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { username, password } = req.body || {}

  // Hardcoded credentials for now
  const VALID_USER = 'admin'
  const VALID_PASS = 'secret'

  if (username === VALID_USER && password === VALID_PASS) {
    // Set a simple auth cookie valid for 7 days
    const maxAge = 60 * 60 * 24 * 7 // 7 days
    res.setHeader('Set-Cookie', `auth=1; Path=/; HttpOnly; Max-Age=${maxAge}; SameSite=Lax`)
    return res.status(200).json({ ok: true })
  }

  return res.status(401).json({ ok: false, message: 'Invalid credentials' })
}
