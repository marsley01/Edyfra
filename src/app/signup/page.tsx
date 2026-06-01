"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, AlertCircle, ShieldCheck, Eye, EyeOff, Venus, Mars, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { signup } from "@/app/actions/auth";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AvatarPicker, type AvatarStyle } from "@/components/ui/avatar-picker";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gender, setGender] = useState<string>("");
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gender) { setError("Please select your gender"); return; }
    if (!avatarStyle) { setError("Please select an avatar"); return; }
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("gender", gender);
    formData.set("avatar", avatarStyle);
    const result = await signup(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success && result.message) {
      toast.success(result.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pt-0 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] space-y-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 text-center">
           <Link href="/" className="flex items-center gap-3 group mb-4">
              <img src="/image.png" alt="Edyfra Logo" className="w-9 h-9 rounded-xl shadow-lg object-cover" />
              <span className="text-3xl font-black text-foreground tracking-tighter">Edyfra</span>
           </Link>
           <h1 className="text-4xl font-black tracking-tightest">Let&apos;s get you started.</h1>
           <p className="text-muted-foreground font-medium text-lg">Create your account and join a community that&apos;s here to help you succeed.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
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
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              <div className="relative">
                <Input 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  placeholder="••••••••" 
                  className="h-14 rounded-2xl px-6 border-border bg-secondary font-medium focus-visible:ring-primary pr-14" 
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

           {/* Gender Selection */}
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">I am</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "MALE", label: "Male", icon: Mars },
                  { value: "FEMALE", label: "Female", icon: Venus },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGender(value)}
                    className={cn(
                      "flex items-center justify-center gap-3 h-14 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all",
                      gender === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
           </div>

           {/* Avatar Selection */}
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Choose your avatar</label>
              <AvatarPicker
                selected={avatarStyle}
                onSelect={setAvatarStyle}
                seed={name || "user"}
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
