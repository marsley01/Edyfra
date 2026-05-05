"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, ArrowRight, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { signup } from "@/app/actions/auth";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await signup(formData);

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
           <Link href="/" className="flex items-center gap-2 group mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 transition-transform group-hover:scale-110">
                <GraduationCap className="h-7 w-7" />
              </div>
           </Link>
           <h1 className="text-4xl font-black tracking-tightest">Let&apos;s get you started.</h1>
           <p className="text-muted-foreground font-medium text-lg">Create your account and join a community that&apos;s here to help you succeed.</p>
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
              <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Full Name</label>
              <Input 
                name="name" 
                type="text" 
                required 
                placeholder="Your Name" 
                className="h-14 rounded-2xl px-6 border-border bg-secondary font-medium focus-visible:ring-primary" 
              />
           </div>

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
              <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Create Password</label>
              <Input 
                name="password" 
                type="password" 
                required 
                placeholder="••••••••" 
                className="h-14 rounded-2xl px-6 border-border bg-secondary font-medium focus-visible:ring-primary" 
              />
           </div>
           
           <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-2xl border border-border/50">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium leading-relaxed text-muted-foreground">
                 By creating an account, you agree to our <Link href="/terms" className="text-primary font-bold">Terms</Link> and <Link href="/privacy" className="text-primary font-bold">Privacy Policy</Link>.
              </p>
           </div>

           <Button 
             type="submit" 
             disabled={loading}
             className="w-full h-16 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95 disabled:opacity-50"
           >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
           </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm font-medium text-muted-foreground">
           Already have an account?{" "}
           <Link href="/login" className="text-primary font-black uppercase text-xs tracking-widest hover:underline decoration-2 underline-offset-4">Log in</Link>
        </p>
      </motion.div>
    </div>
  );
}
