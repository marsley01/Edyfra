"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Sparkles, Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { showError, showSuccess } from "@/lib/toast";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    if (!email.trim()) {
      setEmailError("Drop in your email so we know where to send the reset link.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError("That email doesn't look right — double-check the spelling.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });

      if (error) throw error;
      setSubmitted(true);
      showSuccess("Reset link sent", {
        description: "Open it from your inbox within the next 60 minutes.",
      });
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("rate") || msg.includes("too many")) {
        showError({
          title: "Whoa — too many requests",
          cause: "You've asked for several reset links in a row.",
          fix: "Wait about a minute and try again — and check spam if you haven't got the previous email.",
          raw: err,
        });
      } else if (msg.includes("not found") || msg.includes("no user")) {
        // Supabase intentionally hides "no user" to avoid leaking account existence —
        // but show the user the same friendly note either way.
        setSubmitted(true);
      } else {
        showError({
          title: "We couldn't send the reset link",
          cause: err?.message || "Our auth service didn't respond.",
          fix: "Try again in a moment. If it keeps failing, contact support.",
          raw: err,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Polish */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-center mb-12">
           <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 group-hover:scale-110 transition-all">
                 <Sparkles className="h-6 w-6" />
              </div>
              <span className="text-3xl font-black tracking-tightest uppercase">Edyfra.</span>
           </Link>
        </div>

        <Card className="rounded-[2.5rem] border-border/50 bg-secondary/30 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="space-y-4 p-10 pb-6">
            <CardTitle className="text-4xl font-black tracking-tightest leading-none">
              Forgot <br /> <span className="text-muted-foreground">Password?</span>
            </CardTitle>
            <CardDescription className="text-lg font-medium leading-relaxed">
              {submitted 
                ? "If that email is registered, we've sent a recovery link. Check your inbox (and spam, just in case)." 
                : "No worries — just enter your email and we'll send you a fresh reset link."}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-10 pt-0">
            {!submitted ? (
              <form onSubmit={handleReset} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
                      className="h-14 pl-12 rounded-2xl border-border bg-background shadow-sm focus-visible:ring-primary text-base font-medium"
                      required
                      autoComplete="email"
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs font-bold text-red-500/90 ml-2 animate-in fade-in slide-in-from-top-1">{emailError}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-14 bg-foreground text-background hover:bg-foreground/90 font-black text-xs tracking-widest uppercase rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Reset Link"}
                </Button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
                 <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="h-10 w-10" />
                 </div>
                 <div className="space-y-3 max-w-xs">
                    <h3 className="text-xl font-black">Check your inbox</h3>
                    <p className="text-muted-foreground font-medium text-sm leading-relaxed">
                      We&apos;ve sent a link to <span className="text-foreground font-bold">{email}</span>. Open it within the next 60 minutes to pick a new password.
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Can&apos;t find it? Check spam, or wait 60 seconds and request another.
                    </p>
                 </div>
                 <Button 
                  onClick={() => { setSubmitted(false); setEmail(""); }}
                  variant="outline"
                  className="h-12 px-8 rounded-full border-border font-black text-[10px] tracking-widest uppercase"
                 >
                   Try another email
                 </Button>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-10 pt-0 flex justify-center border-t border-border/50 pt-8">
             <Link href="/login" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-3 w-3" /> Back to Login
             </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
