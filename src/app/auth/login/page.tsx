'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

const supabaseErrors: Record<string, string> = {
  'Invalid login credentials': 'Wrong email or password. Double-check and try again, or reset your password below.',
  'Email not confirmed': 'Could not auto-confirm your email. Check your inbox for the confirmation link, or contact support.',
  'Invalid email': 'That doesn\'t look like a real email address.',
}

function friendlyError(message: string): string {
  const msg = message.toLowerCase()
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Please wait a minute and try again.'
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('abort')) {
    return 'Could not reach the server. Check your internet connection.'
  }
  if (msg.includes('username')) {
    return 'We couldn\'t find that username. Check for typos or use your email instead.'
  }
  if (msg.includes('not authenticated') || msg.includes('session')) {
    return 'Your session expired. Please sign in again.'
  }
  return supabaseErrors[message] || message
}

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function LoginPage() {
  const [input, setInput] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ input?: string; password?: string }>({})
  const router = useRouter()
  const supabase = createClient()

  const isEmail = input.includes('@')

  const validate = () => {
    const errors: { input?: string; password?: string } = {}
    if (!input.trim()) errors.input = 'Enter your email or username'
    else if (isEmail && !looksLikeEmail(input)) errors.input = 'That doesn\'t look like a valid email'
    else if (!isEmail && input.length < 3) errors.input = 'Usernames are at least 3 characters'
    if (!password) errors.password = 'Enter your password'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return

    setLoading(true)

    let email = input

    if (!isEmail) {
      try {
        const res = await fetch(`/api/auth/resolve-username?q=${encodeURIComponent(input)}`)
        if (!res.ok) throw new Error('resolve-failed')
        const data = await res.json()
        if (!data.found) {
          setError(`No account found with the username "${input}". Try signing up or use your email.`)
          setLoading(false)
          return
        }
        email = data.email
      } catch {
        setError('Could not verify your username right now. Try using your email address instead.')
        setLoading(false)
        return
      }
    }

    let { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError?.message === 'Email not confirmed') {
      try {
        await fetch('/api/auth/auto-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        ;({ data, error: signInError } = await supabase.auth.signInWithPassword({ email, password }))
      } catch {
        // fall through to error handling below
      }
    }

    if (signInError) {
      setError(friendlyError(signInError.message))
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f5f1] p-4">
      <div className="w-full max-w-sm">
        {/* Simple wordmark */}
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-[0.15em] text-gray-400">EDYFRA</p>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-7 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
          <h1 className="text-lg font-semibold text-gray-900">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome back — let&apos;s get started.</p>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email or username</label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="you@school.ac.ke"
                className={`mt-1.5 block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 ${
                  fieldErrors.input ? 'border-red-300' : 'border-gray-200'
                }`}
                value={input}
                onChange={(e) => { setInput(e.target.value); setFieldErrors((f) => ({ ...f, input: undefined })) }}
                autoFocus
              />
              {fieldErrors.input && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.input}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 ${
                    fieldErrors.password ? 'border-red-300' : 'border-gray-200'
                  }`}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: undefined })) }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
