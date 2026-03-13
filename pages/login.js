import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (res.ok) {
        router.replace('/thermostat')
      } else {
        const json = await res.json()
        setError(json?.message || 'Login failed')
      }
    } catch (err) {
      setError('Network error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <Head>
        <title>Login</title>
      </Head>
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-2xl mb-4">Sign In</h1>
        <label className="block mb-2">
          <span className="text-sm text-gray-300">Username</span>
          <input value={username} onChange={e => setUsername(e.target.value)} className="mt-1 block w-full p-2 rounded bg-gray-700" />
        </label>

        <label className="block mb-4">
          <span className="text-sm text-gray-300">Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full p-2 rounded bg-gray-700" />
        </label>

        {error && <p className="text-red-400 mb-3">{error}</p>}

        <div className="flex items-center justify-between">
          <button type="submit" className="bg-orange-500 px-4 py-2 rounded hover:bg-orange-600">Sign in</button>
        </div>
      </form>
    </div>
  )
}
