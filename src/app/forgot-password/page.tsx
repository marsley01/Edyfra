'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, ArrowLeft, Mail } from 'lucide-react'

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Enter your email address')
      return
    }
    if (!isValidEmail(email)) {
      setError('That doesn\'t look like a valid email address.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 429) {
          setError('Too many requests. Please wait a minute and try again.')
        } else {
          setError(data.error || 'Something went wrong. Please try again.')
        }
        return
      }
      setSent(true)
    } catch {
      setError('Could not reach the server. Check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f5f1] p-4">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold tracking-[0.15em] text-gray-400">EDYFRA</p>
          </div>

          <div className="rounded-xl border border-gray-200/80 bg-white p-7 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <Mail className="h-5 w-5 text-green-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Check your email</h1>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              If an account exists for <span className="font-medium text-gray-700">{email}</span>, you&apos;ll receive a reset link shortly.
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f5f1] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-[0.15em] text-gray-400">EDYFRA</p>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-7 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
          <h1 className="text-lg font-semibold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your email and we&apos;ll send a reset link.</p>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
