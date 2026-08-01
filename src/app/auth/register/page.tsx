'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, AlertCircle, Check } from 'lucide-react'

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function isValidUsername(v: string) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(v)
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

const steps = ['Details', 'Account'] as const

export default function RegisterPage() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [role, setRole] = useState<'STUDENT' | 'TUTOR'>('STUDENT')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const checkUsername = useCallback((val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val) { setUsernameStatus('idle'); return }
    if (!isValidUsername(val)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?q=${encodeURIComponent(val)}`)
        const data = await res.json()
        setUsernameStatus(data.available ? 'available' : 'taken')
      } catch {
        setUsernameStatus('idle')
      }
    }, 400)
  }, [])

  const canContinue = () => {
    if (step === 0) return name.trim().length > 1 && usernameStatus === 'available'
    if (step === 1) return isValidEmail(email) && password.length >= 6
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 1) {
      if (canContinue()) setStep(1)
      return
    }
    if (!canContinue()) return
    setLoading(true)
    setError(null)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role, username } },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('An account with this email already exists. Try signing in instead.')
      } else if (authError.message.includes('Password should be at least')) {
        setError('Password must be at least 6 characters.')
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    if (authData.user) {
      const res = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name,
          username: authData.user.user_metadata?.username,
          role: authData.user.user_metadata?.role,
        }),
      })

      if (!res.ok) {
        setError('Account created but couldn\'t sync to our database. Please contact support.')
        setLoading(false)
        return
      }

      // If no session was created (email confirmation enabled in Supabase),
      // sign the user in directly — the sync endpoint auto-confirmed the email.
      if (!authData.session) {
        const { error: autoSignInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (autoSignInError) {
          setError('Account created — please sign in with your new password.')
          setLoading(false)
          router.push('/auth/login')
          return
        }
      }

      router.push('/onboarding/choice')
      router.refresh()
    }
  }

  const usernameHelpText = () => {
    switch (usernameStatus) {
      case 'available': return 'Available'
      case 'taken': return 'Taken — try another one'
      case 'invalid': return '3–20 letters, numbers, or underscores'
      case 'checking': return 'Checking...'
      default: return null
    }
  }
  const usernameTextColor = () => {
    switch (usernameStatus) {
      case 'available': return 'text-green-600'
      case 'taken': return 'text-red-500'
      case 'invalid': return 'text-amber-600'
      default: return ''
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f5f1] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-[0.15em] text-gray-400">EDYFRA</p>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-7 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
          <h1 className="text-lg font-semibold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Join Kenya&apos;s study community.</p>

          {/* Step indicator */}
          <div className="mt-6 flex items-center gap-2">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    i <= step ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className={`text-xs font-medium ${i <= step ? 'text-gray-700' : 'text-gray-400'}`}>
                  {label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`mx-1 h-px w-6 ${i < step ? 'bg-indigo-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {step === 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Kamau"
                    className="mt-1.5 block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="johndoe"
                    className={`mt-1.5 block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 ${
                      usernameStatus === 'taken' || usernameStatus === 'invalid'
                        ? 'border-red-300'
                        : usernameStatus === 'available'
                          ? 'border-green-300'
                          : 'border-gray-200'
                    }`}
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); checkUsername(e.target.value) }}
                  />
                  <div className="mt-1 flex items-center gap-1.5">
                    {usernameStatus === 'checking' && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                    {usernameStatus === 'available' && <Check className="h-3 w-3 text-green-500" />}
                    <p className={`text-xs ${usernameTextColor() || 'text-gray-400'}`}>
                      {usernameHelpText() || 'Choose a unique username'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">I am a...</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('STUDENT')}
                      className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                        role === 'STUDENT'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('TUTOR')}
                      className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                        role === 'TUTOR'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Tutor
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="mt-1.5 block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                  {email.length > 0 && !isValidEmail(email) && (
                    <p className="mt-1 text-xs text-red-500">Enter a valid email address</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  {password.length > 0 && password.length < 6 && (
                    <p className="mt-1 text-xs text-red-500">Must be at least 6 characters</p>
                  )}
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !canContinue()}
                className={`flex h-10 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 ${
                  step === 0 ? 'w-full' : 'flex-1'
                }`}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : step < 1 ? (
                  'Continue'
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
