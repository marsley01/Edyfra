'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Check } from 'lucide-react'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords don\'t match.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 429) {
          setError('Too many requests. Wait a minute and try again.')
        } else {
          setError(data.error || 'Failed to update password.')
        }
        return
      }

      setDone(true)
      setTimeout(() => router.push('/auth/login'), 2500)
    } catch {
      setError('Could not reach the server. Check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f5f1] p-4">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold tracking-[0.15em] text-gray-400">EDYFRA</p>
          </div>

          <div className="rounded-xl border border-gray-200/80 bg-white p-7 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Password updated</h1>
            <p className="mt-2 text-sm text-gray-500">Redirecting you to sign in...</p>
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
          <h1 className="text-lg font-semibold text-gray-900">Set new password</h1>
          <p className="mt-1 text-sm text-gray-500">Choose something you&apos;ll remember.</p>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">New password</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="mt-1.5 block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm password</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Re-enter your password"
                className="mt-1.5 block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {confirm.length > 0 && password !== confirm && (
                <p className="mt-1 text-xs text-red-500">Passwords don&apos;t match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
