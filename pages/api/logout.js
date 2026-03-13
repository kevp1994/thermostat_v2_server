export default function handler(req, res) {
  // Clear auth cookie
  res.setHeader('Set-Cookie', 'auth=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax')
  res.status(200).json({ ok: true })
}
