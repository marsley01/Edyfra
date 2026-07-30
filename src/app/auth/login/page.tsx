'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-xl shadow-lg bg-card text-card-foreground">
        <div>
          <h2 className="text-3xl font-bold text-center">Sign in to Edyfra</h2>
          <p className="mt-2 text-center text-muted-foreground">Welcome back, Scholar</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          {error && <div className="p-3 text-sm text-red-500 bg-red-100 rounded-md">{error}</div>}
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email address</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 mt-1 border rounded-md bg-background"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                required
                className="w-full px-3 py-2 mt-1 border rounded-md bg-background"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm">
          Don't have an account? <Link href="/auth/register" className="text-blue-500 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
