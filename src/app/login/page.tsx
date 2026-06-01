"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, AlertCircle, Eye, EyeOff, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
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
              <img src="/image.png" alt="Edyfra Logo" className="w-9 h-9 rounded-xl shadow-lg object-cover" />
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
               className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-sm font-bold"
             >
               <AlertCircle className="h-5 w-5" />
               {error}
             </motion.div>
           )}

           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Email Address</label>
              <Input 
                name="email" 
                type="email" 
                required 
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
                  placeholder="••••••••" 
                  className="h-14 rounded-2xl px-6 pr-12 border-border bg-secondary font-medium focus-visible:ring-primary" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
           </div>
           
           <div className="flex justify-end">
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

        {/* Footer */}
        <p className="text-center text-sm font-medium text-muted-foreground">
           New here?{" "}
           <Link href="/signup" className="text-primary font-black uppercase text-xs tracking-widest hover:underline decoration-2 underline-offset-4">Create account</Link>
        </p>
      </motion.div>
    </div>
  );
}
