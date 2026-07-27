"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import { login } from "@/app/actions/auth";

interface FriendlyError {
  title: string;
  cause: string;
  fix: string;
}

/**
 * Translate Supabase / generic login errors into the
 * { title, cause, fix } shape we show on the page.
 */
function describeLoginError(raw: string): FriendlyError {
  const lower = raw.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
    return {
      title: "That login didn't work",
      cause: "The email and password don't match what we have on file.",
      fix: "Double-check the spelling, or reset your password if you've forgotten it.",
    };
  }
  if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
    return {
      title: "Confirm your email first",
      cause: "We sent a confirmation link to your inbox right after signup.",
      fix: "Open that email and tap the link, then come back here to sign in.",
    };
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return {
      title: "Too many attempts in a row",
      cause: "You've tried to sign in many times in a short window.",
      fix: "Wait about a minute, then try again.",
    };
  }
  if (lower.includes("user not found") || lower.includes("no user")) {
    return {
      title: "We don't have that account",
      cause: "No Edyfra account is registered with that email.",
      fix: "Check the spelling, or create a new account.",
    };
  }
  if (lower.includes("network") || lower.includes("failed to fetch") || lower.includes("network_error")) {
    return {
      title: "We couldn't reach our servers",
      cause: "Your connection dropped or our auth service is busy.",
      fix: "Check your internet and try again in a moment.",
    };
  }
  if (lower.includes("auth/internal-error") || lower.includes("internal-error")) {
    return {
      title: "Firebase sign-in isn't ready yet",
      cause: "Google sign-in is not fully configured for this domain.",
      fix: "Use email & password above, or contact support to enable Google sign-in.",
    };
  }
  if (lower.includes("auth/popup-blocked") || lower.includes("popup")) {
    return {
      title: "Popup was blocked",
      cause: "Your browser blocked the Google sign-in popup.",
      fix: "Allow popups for this site or try a different browser.",
    };
  }
  if (lower.includes("auth/unauthorized-domain") || lower.includes("unauthorized")) {
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

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Surface ?auth_error= from the auth/callback redirect.
  useEffect(() => {
    const authError = searchParams.get("auth_error");
    if (authError) setError(describeLoginError(authError));
  }, [searchParams]);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [firebaseLoading, setFirebaseLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    try {
      const result = await login(formData);
      if (result?.error) {
        setError(describeLoginError(result.error));
        setLoading(false);
        return;
      }
      window.location.href = result?.redirectTo || "/dashboard";
    } catch (err: any) {
      setError(describeLoginError(err?.message || ""));
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      const { getFirebaseAuth } = await import("@/lib/firebase");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(getFirebaseAuth(), provider);
      const idToken = await result.user.getIdToken();

      const resp = await fetch("/api/firebase/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", idToken }),
      });
      const data = await resp.json();
      if (data.success) {
        window.location.href = "/onboarding";
      } else {
        setError(describeLoginError(data.error || "Google sign-in failed"));
      }
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(describeLoginError(err.code || err.message || "Google sign-in failed"));
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleFirebaseReset() {
    setFirebaseLoading(true);
    try {
      const { sendPasswordResetEmail } = await import("firebase/auth");
      const { getFirebaseAuth } = await import("@/lib/firebase");
      const email = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value;
      if (!email) {
        setError({ title: "Enter your email first", cause: "We need your email to send the reset link.", fix: "Type your email above, then try again." });
        return;
      }
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      alert("Password reset link sent to " + email);
    } catch (err: any) {
      setError(describeLoginError(err.code || err.message || "Failed to send reset email"));
    } finally {
      setFirebaseLoading(false);
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

          <div className="flex items-center justify-between">
            <Link href="/forgot-password" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
              Forgot password?
            </Link>
            <button
              type="button"
              onClick={handleFirebaseReset}
              disabled={firebaseLoading}
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
            >
              {firebaseLoading ? "Sending..." : "Reset via Firebase"}
            </button>
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
            <Chrome className="h-5 w-5" />
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
