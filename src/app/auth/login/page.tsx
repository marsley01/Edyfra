'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { AmbientBlobBackground } from '@/components/auth/AmbientBlobBackground'

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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isEmail = input.includes('@')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
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
    <div className="relative min-h-screen overflow-hidden bg-background flex flex-col items-center justify-center p-6 pt-0 font-sans">
      <AmbientBlobBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] space-y-12"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex items-center gap-3 group mb-4">
            <img src="/image.png" alt="Edyfra Logo" className="w-9 h-9 rounded-xl shadow-lg object-cover" />
            <span className="text-3xl font-black text-foreground tracking-tighter">Edyfra</span>
          </Link>
          <h1 className="text-4xl font-black tracking-tightest">Welcome back.</h1>
          <p className="text-muted-foreground font-medium text-lg">We&apos;re glad you&apos;re here. Sign in to pick up where you left off.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-sm font-bold"
            >
              <AlertCircle className="h-5 w-5" />
              {error}
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Email Address</label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="username"
              required
              placeholder="you@example.com"
              className="h-14 w-full rounded-2xl px-6 border border-border bg-secondary font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="h-14 w-full rounded-2xl px-6 pr-12 border border-border bg-secondary font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95 disabled:opacity-50 hover:bg-primary hover:text-white"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (
              <span className="flex items-center justify-center">Sign In <ArrowRight className="ml-2 h-4 w-4" /></span>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm font-medium text-muted-foreground">
          New here?{' '}
          <Link href="/auth/register" className="text-primary font-black uppercase text-xs tracking-widest hover:underline decoration-2 underline-offset-4">
            Create account
          </Link>
        </p>
      </motion.div>
    </div>
  )
}