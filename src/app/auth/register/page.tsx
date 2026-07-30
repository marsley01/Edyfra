'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('STUDENT') // STUDENT or TUTOR
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      // 2. Sync to Prisma Database via API route
      const res = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name,
          role: authData.user.user_metadata?.role
        })
      })

      if (!res.ok) {
        setError("Account created, but database sync failed. Please contact support.")
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-xl shadow-lg bg-card text-card-foreground">
        <div>
          <h2 className="text-3xl font-bold text-center">Create an Account</h2>
          <p className="mt-2 text-center text-muted-foreground">Join Kenya's top study platform</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-6">
          {error && <div className="p-3 text-sm text-red-500 bg-red-100 rounded-md">{error}</div>}
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 mt-1 border rounded-md bg-background"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
            <div>
              <label className="text-sm font-medium">I am a...</label>
              <select 
                className="w-full px-3 py-2 mt-1 border rounded-md bg-background"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="STUDENT">Student</option>
                <option value="TUTOR">Tutor</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="text-center text-sm">
          Already have an account? <Link href="/auth/login" className="text-blue-500 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
