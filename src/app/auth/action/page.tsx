"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, CheckCircle2, Eye, EyeOff, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFirebaseAuth } from "@/lib/firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { cn } from "@/lib/utils";

function AuthActionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [verifying, setVerifying] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!mode || !oobCode) {
      setError("Invalid action link. Please request a new password reset email.");
      setVerifying(false);
      return;
    }

    if (mode === "resetPassword") {
      const auth = getFirebaseAuth();
      verifyPasswordResetCode(auth, oobCode)
        .then((emailRes) => {
          setEmail(emailRes);
          setVerifying(false);
        })
        .catch((err) => {
          console.error("verify error:", err);
          setError("This link is invalid or has expired. Please request a new one.");
          setVerifying(false);
        });
    } else {
      setError("Unsupported action mode.");
      setVerifying(false);
    }
  }, [mode, oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Your new password needs to be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match. Please re-type them.");
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      await confirmPasswordReset(auth, oobCode!, password);
      setDone(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Verifying link...</p>
      </div>
    );
  }

  if (error && !done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center space-y-6 py-8"
      >
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Oops! Something went wrong</h2>
          <p className="text-muted-foreground max-w-sm">{error}</p>
        </div>
        <Button onClick={() => router.push("/forgot-password")} className="w-full sm:w-auto mt-4 rounded-full">
          Request New Link
        </Button>
      </motion.div>
    );
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center space-y-6 py-8"
      >
        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Password Reset Complete!</h2>
          <p className="text-muted-foreground max-w-sm">
            Your password has been successfully updated. You can now log in using your new credentials.
          </p>
        </div>
        <Button onClick={() => router.push("/login")} className="w-full sm:w-auto mt-4 rounded-full group">
          Go to Login
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="space-y-2 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create new password</h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-[280px] sm:max-w-xs mx-auto">
          {email ? (
            <>
              Resetting password for <strong className="text-foreground font-medium">{email}</strong>
            </>
          ) : (
            "Enter your new secure password below."
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <div className="space-y-2 relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-12 pr-10 bg-background/50 backdrop-blur-sm border-white/10 focus-visible:ring-primary/50 rounded-xl"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="space-y-2 relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              className="h-12 pr-10 bg-background/50 backdrop-blur-sm border-white/10 focus-visible:ring-primary/50 rounded-xl"
              required
            />
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          disabled={loading || !password || !confirm}
          className="w-full h-12 rounded-xl font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving password...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>
    </motion.div>
  );
}

export default function AuthActionPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-white/10 dark:from-white/5 dark:to-white/5 rounded-3xl blur-xl" />
        <div className="bg-card/40 dark:bg-black/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-2xl rounded-3xl p-6 sm:p-8 relative">
          <Suspense fallback={
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <AuthActionContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
