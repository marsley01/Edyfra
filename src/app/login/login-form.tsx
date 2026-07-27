"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";

interface FriendlyError {
  title: string;
  cause: string;
  fix: string;
}

function describeLoginError(raw: string): FriendlyError {
  const lower = raw.toLowerCase();

  if (lower.includes("invalid-credential") || lower.includes("wrong-password") || lower.includes("user-not-found")) {
    return {
      title: "That login didn't work",
      cause: "The email and password don't match what we have on file.",
      fix: "Double-check the spelling, or reset your password if you've forgotten it.",
    };
  }
  if (lower.includes("too-many-requests") || lower.includes("rate limit")) {
    return {
      title: "Too many attempts in a row",
      cause: "You've tried to sign in many times in a short window.",
      fix: "Wait about a minute, then try again.",
    };
  }
  if (lower.includes("invalid-email")) {
    return {
      title: "That email doesn't look right",
      cause: "The email format isn't valid.",
      fix: "Double-check for typos and try again.",
    };
  }
  if (lower.includes("network") || lower.includes("failed to fetch") || lower.includes("network_error")) {
    return {
      title: "We couldn't reach our servers",
      cause: "Your connection dropped or our auth service is busy.",
      fix: "Check your internet and try again in a moment.",
    };
  }
  if (lower.includes("internal-error") || lower.includes("auth/internal-error")) {
    return {
      title: "Firebase sign-in isn't ready yet",
      cause: "Google sign-in is not fully configured for this domain.",
      fix: "Use email & password above, or contact support to enable Google sign-in.",
    };
  }
  if (lower.includes("popup")) {
    return {
      title: "Popup was blocked",
      cause: "Your browser blocked the Google sign-in popup.",
      fix: "Allow popups for this site or try a different browser.",
    };
  }
  if (lower.includes("unauthorized") || lower.includes("unauthorized-domain")) {
    return {
      title: "This domain isn't authorized",
      cause: "Google sign-in isn't allowed on this domain yet.",
      fix: "Use email & password, or ask the admin to add this domain in Firebase.",
    };
  }
  return {
    title: "We couldn't sign you in",
    cause: raw || "Something went wrong while signing you in.",
    fix: "Give it another try. If it keeps failing, contact support.",
  };
}

async function exchangeFirebaseToken(idToken: string): Promise<{ success: boolean; error?: string; redirectTo?: string }> {
  const resp = await fetch("/api/firebase/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", idToken }),
  });
  const data = await resp.json();
  if (data.success) return { success: true, redirectTo: data.isNew ? "/onboarding" : "/dashboard" };
  return { success: false, error: data.error || "Firebase auth failed" };
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const authError = searchParams.get("auth_error");
    if (authError) setError(describeLoginError(authError));
  }, [searchParams]);

  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { getFirebaseAuth } = await import("@/lib/firebase");
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      const idToken = await cred.user.getIdToken();

      const result = await exchangeFirebaseToken(idToken);
      if (result.error) {
        setError(describeLoginError(result.error));
        setLoading(false);
        return;
      }
      window.location.href = result.redirectTo || "/dashboard";
    } catch (err: any) {
      setError(describeLoginError(err.code || err.message || ""));
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      const { getFirebaseAuth } = await import("@/lib/firebase");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(getFirebaseAuth(), provider);
      const idToken = await result.user.getIdToken();
      const resp = await exchangeFirebaseToken(idToken);
      setGoogleLoading(false);
      if (resp.error) {
        setError(describeLoginError(resp.error));
      } else {
        window.location.href = resp.redirectTo || "/dashboard";
      }
    } catch (err: any) {
      setGoogleLoading(false);
      if (err?.code === "auth/popup-closed-by-user") return;
      setError(describeLoginError(err?.code || err?.message || ""));
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pt-0 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] space-y-12"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex items-center gap-3 group mb-4">
            <Image src="/image.png" alt="Edyfra Logo" width={36} height={36} className="w-9 h-9 rounded-xl shadow-lg object-cover" priority />
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
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-sm"
              role="alert"
            >
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-red-500 font-black">{error.title}</p>
                <div className="space-y-1 text-foreground/85 leading-relaxed">
                  <p>
                    <span className="font-bold text-foreground/60 text-xs uppercase tracking-wider mr-1">Why:</span>
                    {error.cause}
                  </p>
                  <p>
                    <span className="font-bold text-foreground/60 text-xs uppercase tracking-wider mr-1">Try:</span>
                    {error.fix}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Email Address</label>
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-14 rounded-2xl px-6 border-border bg-secondary font-medium focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Password</label>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-14 rounded-2xl px-6 pr-12 border-border bg-secondary font-medium focus-visible:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <Link href="/forgot-password" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-16 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google Sign-In */}
        <Button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          variant="outline"
          className="w-full h-14 rounded-full border-2 font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3"
        >
          {googleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {googleLoading ? "Signing in..." : "Continue with Google"}
        </Button>

        {/* Footer */}
        <p className="text-center text-sm font-medium text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="text-primary font-black uppercase text-xs tracking-widest hover:underline decoration-2 underline-offset-4">Create account</Link>
        </p>
      </motion.div>
    </div>
  );
}
