'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, ArrowLeft, Mail, ArrowRight } from 'lucide-react'

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
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-4xl font-black tracking-tightest">Check your email</h1>
            <p className="text-muted-foreground font-medium text-lg leading-relaxed">
              If an account exists for <span className="font-bold text-foreground">{email}</span>, you&apos;ll receive a reset link shortly.
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
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
          <h1 className="text-4xl font-black tracking-tightest">Reset your password.</h1>
          <p className="text-muted-foreground font-medium text-lg">Enter your email and we&apos;ll send you a reset link.</p>
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
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-14 w-full rounded-2xl px-6 border border-border bg-secondary font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-primary/20 transition-all"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95 disabled:opacity-50 hover:bg-primary hover:text-white"
          >
            {loading
              ? <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              : <span className="flex items-center justify-center">Send Reset Link <ArrowRight className="ml-2 h-4 w-4" /></span>}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm font-medium text-muted-foreground">
          <Link href="/auth/login" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">
            <span className="flex items-center justify-center gap-1.5"><ArrowLeft className="h-4 w-4" /> Back to sign in</span>
          </Link>
        </p>
      </motion.div>
    </div>
  )
}