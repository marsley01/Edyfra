"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import { institutionLogin } from "@/app/actions/institution-auth";

interface FriendlyError {
  title: string;
  cause: string;
  fix: string;
}

function describe(raw: string): FriendlyError {
  const lower = raw.toLowerCase();
  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
    return {
      title: "That didn't match our records",
      cause: "The email or password isn't right for this institution.",
      fix: "Double-check both, or ask your institution admin to resend your invite.",
    };
  }
  if (lower.includes("not a member") || lower.includes("not part") || lower.includes("not registered")) {
    return {
      title: "You aren't on this institution yet",
      cause: "Your account isn't linked to an institution we recognize.",
      fix: "Ask your admin to send you an invite, then sign in again.",
    };
  }
  if (lower.includes("pending") || lower.includes("review")) {
    return {
      title: "Your institution is still pending review",
      cause: "We haven't finished verifying the school yet.",
      fix: "Hang tight — we'll email the admin as soon as it's approved.",
    };
  }
  return {
    title: "We couldn't sign you in",
    cause: raw || "Something went wrong on our side.",
    fix: "Give it another try, or reach out to the Edyfra team.",
  };
}

export default function InstitutionsLogin() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<FriendlyError | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      const result = await institutionLogin(formData);
      if (result?.error) {
        setError(describe(result.error));
        setLoading(false);
        return;
      }
      const target = result?.redirectTo || "/institution/dashboard";
      window.location.href = target;
    } catch (err: any) {
      setError(describe(err?.message || ""));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 font-sans selection:bg-indigo-500/30">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] space-y-10"
      >
        {/* Branding */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
            <Building2 className="h-7 w-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Edyfra Institutions
            </h1>
            <p className="text-sm text-neutral-400 mt-1 leading-relaxed">
              Sign in to your institution&apos;s private network
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-sm"
              role="alert"
            >
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <p className="text-red-400 font-black">{error.title}</p>
                <p className="text-neutral-400">
                  <span className="font-bold text-neutral-500 text-[10px] uppercase tracking-wider mr-1">Why:</span>
                  {error.cause}
                </p>
                <p className="text-neutral-400">
                  <span className="font-bold text-neutral-500 text-[10px] uppercase tracking-wider mr-1">Try:</span>
                  {error.fix}
                </p>
              </div>
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-neutral-500">
              Institutional Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@school.ac.ke"
              className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-neutral-600 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-neutral-500">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 pr-12 text-sm text-white placeholder-neutral-600 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign in to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-sm text-neutral-500">
            Not registered yet?{" "}
            <Link
              href="/institutions/signup"
              className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
            >
              Apply for your institution
            </Link>
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              &larr; Student or Tutor sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
