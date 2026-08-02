'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, AlertCircle, ShieldCheck, Eye, EyeOff, Check, Venus, Mars } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AvatarPicker, type AvatarStyle } from '@/components/ui/avatar-picker'

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function isValidUsername(v: string) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(v)
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [role, setRole] = useState<'STUDENT' | 'TUTOR'>('STUDENT')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('')
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle | null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  const canSubmit = () =>
    name.trim().length > 1 &&
    usernameStatus === 'available' &&
    isValidEmail(email) &&
    password.length >= 6

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!canSubmit()) return
    if (!gender) { setError('Please select your gender'); return }
    if (!avatarStyle) { setError('Please select an avatar'); return }
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role, username, gender, avatar: avatarUrl } },
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
          gender: authData.user.user_metadata?.gender,
          avatar: authData.user.user_metadata?.avatar,
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
      case 'available': return 'text-green-500'
      case 'taken': return 'text-red-500'
      case 'invalid': return 'text-amber-500'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pt-0 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] space-y-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex items-center gap-3 group mb-4">
            <img src="/image.png" alt="Edyfra Logo" className="w-9 h-9 rounded-xl shadow-lg object-cover" />
            <span className="text-3xl font-black text-foreground tracking-tighter">Edyfra</span>
          </Link>
          <h1 className="text-4xl font-black tracking-tightest">Let&apos;s get you started.</h1>
          <p className="text-muted-foreground font-medium text-lg">Create your account and join a community that&apos;s here to help you succeed.</p>
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
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Your Name"
              className="h-14 w-full rounded-2xl px-6 border border-border bg-secondary font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); checkUsername(e.target.value) }}
              required
              autoComplete="username"
              placeholder="johndoe"
              className={cn(
                "h-14 w-full rounded-2xl px-6 border bg-secondary font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-primary/20 transition-all",
                usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-500/40' : usernameStatus === 'available' ? 'border-green-500/40' : 'border-border'
              )}
            />
            <div className="flex items-center gap-1.5 ml-4">
              {usernameStatus === 'checking' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              {usernameStatus === 'available' && <Check className="h-3 w-3 text-green-500" />}
              <p className={cn("text-xs font-medium", usernameTextColor() || 'text-muted-foreground')}>
                {usernameHelpText() || 'Choose a unique username'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              {(['STUDENT', 'TUTOR'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "h-14 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all",
                    role === r
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {r === 'STUDENT' ? 'Student' : 'Tutor'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-14 w-full rounded-2xl px-6 border-border bg-secondary font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Create Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-14 w-full rounded-2xl px-6 pr-14 border-border bg-secondary font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-primary/20 transition-all"
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
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">I am</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'MALE', label: 'Male', icon: Mars },
                { value: 'FEMALE', label: 'Female', icon: Venus },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGender(value as 'MALE' | 'FEMALE')}
                  className={cn(
                    "flex items-center justify-center gap-3 h-14 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all",
                    gender === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Choose your avatar</label>
            <AvatarPicker
              selected={avatarStyle}
              onSelect={setAvatarStyle}
              onSelectUrl={setAvatarUrl}
              seed={name || 'user'}
              gender={gender}
            />
          </div>

          <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-2xl border border-border/50">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] font-medium leading-relaxed text-muted-foreground">
              By creating an account, you agree to our <Link href="/terms" className="text-primary font-bold">Terms</Link> and <Link href="/privacy" className="text-primary font-bold">Privacy Policy</Link>.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit()}
            className="w-full h-16 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95 disabled:opacity-50 hover:bg-primary hover:text-white"
          >
            {loading
              ? <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              : <span className="flex items-center justify-center">Create Account <ArrowRight className="ml-2 h-4 w-4" /></span>}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm font-medium text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary font-black uppercase text-xs tracking-widest hover:underline decoration-2 underline-offset-4">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}