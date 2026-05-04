"use client";

import { motion } from "framer-motion";
import { GraduationCap, ArrowRight, Github, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pt-0">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] space-y-12"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 text-center">
           <Link href="/" className="flex items-center gap-2 group mb-4">
             <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
               <GraduationCap className="h-7 w-7" />
             </div>
           </Link>
           <h1 className="text-4xl font-black tracking-tightest">Initialize.</h1>
           <p className="text-muted-foreground font-medium">Join 10,000+ scholars in the Edyfra network.</p>
        </div>

        {/* Form */}
        <div className="space-y-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest ml-4">Full Name</label>
              <Input placeholder="Mash Scholar" className="h-14 rounded-2xl px-6 border-border bg-secondary" />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest ml-4">Email Address</label>
              <Input placeholder="mash@edyfra.com" className="h-14 rounded-2xl px-6 border-border bg-secondary" />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest ml-4">Institutional Protocol (Password)</label>
              <Input type="password" placeholder="••••••••" className="h-14 rounded-2xl px-6 border-border bg-secondary" />
           </div>
           
           <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-2xl border border-border/50">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium leading-relaxed text-muted-foreground">
                 By initializing your account, you agree to our <Link href="/terms" className="text-primary font-bold">Terms of Synchronization</Link> and <Link href="/privacy" className="text-primary font-bold">Privacy Protocols</Link>.
              </p>
           </div>

           <Button className="w-full h-14 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-xl transition-all active:scale-95">
              Create My Account <ArrowRight className="ml-2 h-4 w-4" />
           </Button>
        </div>

        {/* Divider */}
        <div className="relative">
           <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
           <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="bg-background px-4 text-muted-foreground">Or join with</span>
           </div>
        </div>

        {/* Social */}
        <div className="grid grid-cols-2 gap-4">
           <Button variant="outline" className="h-14 rounded-2xl border-border hover:bg-secondary transition-all gap-2 font-bold">
              <Github className="h-4 w-4" /> Github
           </Button>
           <Button variant="outline" className="h-14 rounded-2xl border-border hover:bg-secondary transition-all gap-2 font-bold">
              <Mail className="h-4 w-4" /> Google
           </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-sm font-medium text-muted-foreground">
           Already have an account?{" "}
           <Link href="/login" className="text-primary font-black uppercase text-xs tracking-widest hover:underline">Log in</Link>
        </p>
      </motion.div>
    </div>
  );
}
