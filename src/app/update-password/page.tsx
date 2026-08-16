'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, Check, ArrowRight, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pt-0 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px] space-y-8 text-center"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <Link href="/" className="flex items-center gap-3 group mb-4">
              <img src="/image.png" alt="Edyfra Logo" className="w-9 h-9 rounded-xl shadow-lg object-cover" />
              <span className="text-3xl font-black text-foreground tracking-tighter">Edyfra</span>
            </Link>
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
              <Check className="h-7 w-7 text-emerald-500" />
            </div>
            <h1 className="text-4xl font-black tracking-tightest">Password updated</h1>
            <p className="text-muted-foreground font-medium text-lg">Redirecting you to sign in...</p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pt-0 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] space-y-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex items-center gap-3 group mb-4">
            <img src="/image.png" alt="Edyfra Logo" className="w-9 h-9 rounded-xl shadow-lg object-cover" />
            <span className="text-3xl font-black text-foreground tracking-tighter">Edyfra</span>
          </Link>
          <h1 className="text-4xl font-black tracking-tightest">Set a new password.</h1>
          <p className="text-muted-foreground font-medium text-lg">Choose something you&apos;ll remember.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
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
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">New password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="h-14 w-full rounded-2xl px-6 pr-14 border border-border bg-secondary font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-primary/20 transition-all"
                autoFocus
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

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              className="h-14 w-full rounded-2xl px-6 border border-border bg-secondary font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-primary/20 transition-all"
            />
            {confirm.length > 0 && password !== confirm && (
              <p className="ml-4 text-xs font-medium text-red-500">Passwords don&apos;t match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95 disabled:opacity-50 hover:bg-primary hover:text-white"
          >
            {loading
              ? <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              : <span className="flex items-center justify-center">Update Password <ArrowRight className="ml-2 h-4 w-4" /></span>}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm font-medium text-muted-foreground">
          <Link href="/auth/login" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}