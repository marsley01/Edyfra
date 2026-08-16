'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, AlertCircle, Building2, ArrowLeft, ChevronRight } from 'lucide-react'

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function friendlyError(message: string): string {
  const msg = message.toLowerCase()
  if (msg.includes('invalid login credentials')) {
    return 'Wrong email or password. Try again or reset your password below.'
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Could not reach the server. Check your internet connection.'
  }
  if (msg.includes('username')) {
    return 'We couldn\'t find that username in this institution.'
  }
  return message
}

export default function InstitutionLoginPage() {
  const [step, setStep] = useState(0)
  const [tenantCode, setTenantCode] = useState('')
  const [tenantInfo, setTenantInfo] = useState<{ name: string; location?: string | null } | null>(null)
  const [checkingTenant, setCheckingTenant] = useState(false)
  const [tenantError, setTenantError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isEmail = input.includes('@')

  const handleVerifyTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = tenantCode.trim()
    if (code.length < 2) {
      setTenantError('Enter a valid school code')
      return
    }
    setCheckingTenant(true)
    setTenantError(null)

    try {
      const res = await fetch(`/api/auth/verify-tenant?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (data.found && data.institution) {
        setTenantInfo({ name: data.institution.name, location: data.institution.location })
        setStep(1)
      } else {
        setTenantError(`No institution found with code "${code}". Check with your school admin.`)
      }
    } catch {
      setTenantError('Could not verify the institution code right now.')
    } finally {
      setCheckingTenant(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    setLoading(true)
    setError(null)

    let email = input

    if (!isEmail) {
      try {
        const res = await fetch(`/api/auth/resolve-username?q=${encodeURIComponent(input)}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!data.found) {
          setError(`No account found with the username "${input}" at this institution.`)
          setLoading(false)
          return
        }
        email = data.email
      } catch {
        setError('Could not verify your username. Try your email instead.')
        setLoading(false)
        return
      }
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(friendlyError(signInError.message))
      setLoading(false)
      return
    }

    if (data.session) {
      try {
        await fetch('/api/auth/bump-token', { method: 'POST' })
      } catch {
        // Bump is non-critical
      }
      router.push('/institution/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1120] p-4">
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '48px 48px' }}
      />

      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-[0.15em] text-white/30">INSTITUTION PORTAL</p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-7 shadow-lg">
          {/* Tenant badge or title */}
          {tenantInfo ? (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3.5 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Building2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{tenantInfo.name}</p>
                {tenantInfo.location && (
                  <p className="truncate text-xs text-white/40">{tenantInfo.location}</p>
                )}
              </div>
              <button
                onClick={() => { setStep(0); setTenantInfo(null); setTenantCode('') }}
                className="shrink-0 rounded px-2 py-1 text-xs font-medium text-white/40 hover:bg-white/[0.06] hover:text-white/60"
              >
                Change
              </button>
            </div>
          ) : (
            <h1 className="text-lg font-semibold text-white">Admin sign in</h1>
          )}

          <p className="mt-1 text-sm text-white/40">
            {step === 0 ? 'Enter your school code to get started.' : 'Sign in with your staff account.'}
          </p>

          {/* Step dots */}
          {tenantInfo && (
            <div className="mt-4 flex gap-1.5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i <= step ? 'w-5 bg-emerald-400' : 'w-1 bg-white/[0.08]'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Tenant error */}
          {tenantError && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>{tenantError}</span>
            </div>
          )}

          {/* Login error */}
          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {step === 0 && (
            <form onSubmit={handleVerifyTenant} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60">School code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STRATHMORE"
                  className="mt-1.5 block w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-emerald-500/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/20"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={checkingTenant || tenantCode.trim().length < 2}
                className="flex h-10 w-full items-center justify-center rounded-lg bg-emerald-500 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-40"
              >
                {checkingTenant ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1.5">
                    Continue <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </button>

              <p className="pt-1 text-center text-xs text-white/20">
                Ask your school admin for your institution code
              </p>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60">Email or username</label>
                <input
                  type="text"
                  required
                  placeholder="admin@school.ac.ke"
                  className="mt-1.5 block w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-emerald-500/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/20"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-white/60">Password</label>
                  <Link href="/forgot-password" className="text-xs font-medium text-emerald-400 hover:text-emerald-300">
                    Forgot?
                  </Link>
                </div>
                <div className="relative mt-1.5">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    className="block w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-white/20 focus:border-emerald-500/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/50"
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="flex h-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-medium text-white/60 hover:bg-white/[0.08]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg bg-emerald-500 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-40"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 space-y-2 text-center text-sm text-white/30">
          <p>
            Not registered?{' '}
            <Link href="/institution/apply" className="font-medium text-emerald-400 hover:text-emerald-300">
              Apply here
            </Link>
          </p>
          <p>
            <Link href="/auth/login" className="text-xs text-white/20 hover:text-white/40">
              Student / tutor sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
