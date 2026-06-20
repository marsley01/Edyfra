"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from "@/lib/toast";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Guard: only allow this page when there's an active recovery session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(Boolean(data.session));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Your new password needs to be at least 8 characters so it's hard to guess.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match — re-type them carefully.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        showError({
          title: "Couldn't save your new password",
          cause: updateError.message,
          fix: "Make sure your reset link hasn't expired, then try again.",
          raw: updateError,
        });
        setLoading(false);
        return;
      }
      setDone(true);
      showSuccess("Password updated", {
        description: "You can sign in with your new password now.",
      });
      setTimeout(() => router.replace("/login"), 1800);
    } catch (err: any) {
      showError({
        title: "Something tripped while saving",
        cause: err?.message || "We're not sure what caused it.",
        fix: "Try again, or request a fresh reset link.",
        raw: err,
      });
      setLoading(false);
    }
  }

  if (hasSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasSession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tightest">This reset link is no longer valid</h1>
          <div className="space-y-2 text-sm text-muted-foreground text-left rounded-2xl border border-border bg-secondary/40 p-5">
            <p><span className="font-bold text-foreground/80">What happened:</span> we couldn&apos;t find an active recovery session.</p>
            <p><span className="font-bold text-foreground/80">Why:</span> the link expired, was already used, or you opened it in a different browser.</p>
            <p><span className="font-bold text-foreground/80">Try this:</span> request a brand-new link and open it in the same browser within an hour.</p>
          </div>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 h-12 rounded-full bg-foreground text-background px-6 font-black text-xs tracking-widest uppercase"
          >
            Request a new link <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] space-y-10"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex items-center gap-3 group mb-4">
            <Image src="/image.png" alt="Edyfra Logo" width={36} height={36} className="w-9 h-9 rounded-xl shadow-lg object-cover" priority />
            <span className="text-3xl font-black text-foreground tracking-tighter">Edyfra</span>
          </Link>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tightest">Pick a new password.</h1>
          <p className="text-muted-foreground font-medium text-sm max-w-xs">
            Make it at least 8 characters. Something only you would think of.
          </p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold">All set — signing you in now…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 text-sm font-bold"
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">New password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    "h-14 rounded-2xl px-6 pr-12 border-border bg-secondary font-medium focus-visible:ring-primary",
                  )}
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

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Confirm new password</label>
              <Input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="h-14 rounded-2xl px-6 border-border bg-secondary font-medium focus-visible:ring-primary"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-16 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>Save new password <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-xs font-medium text-muted-foreground">
          Changed your mind?{" "}
          <Link href="/login" className="text-primary font-black uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
            Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
