"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InstitutionLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const code = formData.get("code") as string;

    if (!code) {
      setError("Please enter your institution access code.");
      setLoading(false);
      return;
    }

    try {
      const { login } = await import("@/app/actions/auth");
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch {
      setError("Unable to sign in. Please check your credentials and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] space-y-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3730A3] text-white text-lg font-bold">
              E
            </div>
            <span className="text-3xl font-black text-gray-900 tracking-tighter">
              Edyfra
            </span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#3730A3]/10 px-4 py-1.5 text-xs font-semibold text-[#3730A3]">
            <Building2 className="h-3.5 w-3.5" />
            Institution Portal
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tightest mt-2">
            Welcome back.
          </h1>
          <p className="text-gray-500 font-medium">
            Sign in to your institution dashboard to manage students, tutors, and resources.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="ml-1 text-xs font-semibold text-gray-500">
              Institution Code
            </label>
            <Input
              name="code"
              type="text"
              required
              placeholder="e.g. KU-2026"
              className="h-12 rounded-xl border-gray-200 bg-white px-5 text-sm font-medium focus-visible:ring-[#3730A3]"
            />
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-xs font-semibold text-gray-500">
              Email Address
            </label>
            <Input
              name="email"
              type="email"
              required
              placeholder="admin@institution.ac.ke"
              className="h-12 rounded-xl border-gray-200 bg-white px-5 text-sm font-medium focus-visible:ring-[#3730A3]"
            />
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-xs font-semibold text-gray-500">
              Password
            </label>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                className="h-12 rounded-xl border-gray-200 bg-white px-5 pr-12 text-sm font-medium focus-visible:ring-[#3730A3]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-[#3730A3] text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#3730A3]/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Sign In to Institution Portal
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Not an institution?{" "}
          <Link href="/login" className="font-semibold text-[#3730A3] hover:underline">
            Student or Tutor login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
