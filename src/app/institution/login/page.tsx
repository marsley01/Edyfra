"use client";

import { useState } from "react";
import { Building2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
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

export default function InstitutionLogin() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<FriendlyError | null>(null);

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
      }
    } catch (err: any) {
      setError(describe(err?.message || ""));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
            <Building2 className="h-8 w-8 text-indigo-400" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-foreground">
          Institution Portal
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Sign in to manage your school&apos;s private network
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-secondary/50 py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-border relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
          
          <form className="space-y-6" onSubmit={handleLogin} noValidate>
            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-sm" role="alert">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <p className="text-red-500 font-black">{error.title}</p>
                  <p className="text-foreground/85">
                    <span className="font-bold text-foreground/60 text-xs uppercase tracking-wider mr-1">Why:</span>
                    {error.cause}
                  </p>
                  <p className="text-foreground/85">
                    <span className="font-bold text-foreground/60 text-xs uppercase tracking-wider mr-1">Try:</span>
                    {error.fix}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                School Email Address
              </label>
              <div className="mt-2">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-border rounded-xl shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-background text-foreground h-12"
                  placeholder="admin@school.ac.ke"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                Password
              </label>
              <div className="mt-2">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-border rounded-xl shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-background text-foreground h-12"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-indigo-400 hover:text-indigo-300">
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-background transition-colors"
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
            </div>
          </form>

          <div className="mt-6 text-center">
             <p className="text-sm text-muted-foreground">
               Not registered yet? <Link href="/institution" className="text-indigo-400 font-medium hover:text-indigo-300">Contact sales for onboarding</Link>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
