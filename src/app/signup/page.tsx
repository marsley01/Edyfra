"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, AlertCircle, ShieldCheck, Eye, EyeOff, Venus, Mars } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import { signup } from "@/app/actions/auth";

import { showSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AvatarPicker, type AvatarStyle } from "@/components/ui/avatar-picker";

interface FriendlyError {
  title: string;
  cause: string;
  fix: string;
}

function describeSignupError(raw: string): FriendlyError {
  const lower = raw.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("duplicate")) {
    return {
      title: "You already have an account",
      cause: "That email is already signed up with Edyfra.",
      fix: "Head to Login and use that email, or reset your password if you've forgotten it.",
    };
  }
  if (lower.includes("password") && (lower.includes("weak") || lower.includes("short") || lower.includes("characters"))) {
    return {
      title: "Your password needs more muscle",
      cause: "It's too short or too easy to guess.",
      fix: "Use at least 8 characters with a mix of letters and numbers.",
    };
  }
  if (lower.includes("invalid") && lower.includes("email")) {
    return {
      title: "That email doesn't look right",
      cause: "We can't tell where to send your confirmation link.",
      fix: "Double-check for typos and try again.",
    };
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return {
      title: "We can't reach our servers",
      cause: "Your connection dropped or our signup service is busy.",
      fix: "Check your internet and try again in a moment.",
    };
  }
  if (lower.includes("rate") || lower.includes("too many")) {
    return {
      title: "A few too many tries",
      cause: "You've made several signup attempts in a short window.",
      fix: "Wait about a minute and try again.",
    };
  }
  return {
    title: "We couldn't create your account",
    cause: raw || "Something went wrong on our side.",
    fix: "Give it another go. If it keeps failing, ping us via the Contact page.",
  };
}

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  
  // Step 1 State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Step 2 State
  const [gender, setGender] = useState<string>("");
  const [referralCode, setReferralCode] = useState("");

  // Step 3 State
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const validateStep1 = () => {
    if (!name.trim()) {
      setError({
        title: "We need your name",
        cause: "Tutors will see this on your study room and messages.",
        fix: "Type your first name (or full name) and continue.",
      });
      return false;
    }
    if (!email.trim()) { 
      setEmailError("Email address is required so we can send your confirmation link.");
      return false; 
    }
    if (!email.includes("@")) {
      setEmailError("Please include an '@' in your email so it can actually reach you.");
      return false;
    }
    if (password.length < 6) {
      setError({
        title: "Your password is a little short",
        cause: "We need at least 6 characters to keep your account safe.",
        fix: "Add a few more characters — letters and numbers are best.",
      });
      return false;
    }
    setEmailError("");
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!gender) {
      setError({
        title: "Pick one to continue",
        cause: "We use this only to match you with the right peers and tutors.",
        fix: "Tap Male or Female above, then continue.",
      });
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    setEmailError("");
    setStep(s => Math.max(1, s - 1));
  };

  async function handleSubmit(e?: React.FormEvent, skipAvatar = false) {
    if (e) e.preventDefault();
    if (step < 3) return; // Prevent premature submission

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("email", email);
    formData.set("password", password);
    formData.set("gender", gender);
    if (referralCode) formData.set("referral_code", referralCode);
    
    // Only append avatar data if not skipped and selected
    if (!skipAvatar && avatarStyle) {
      formData.set("avatar", avatarStyle);
      if (avatarUrl) formData.set("avatarUrl", avatarUrl);
    }

    try {
      const result = await signup(formData);

      if (result?.error) {
        setError(describeSignupError(result.error));
        setLoading(false);
      } else if (result?.success && result.message) {
        showSuccess("Account created!", {
          description: result.message,
        });
        setLoading(false);
      }
    } catch (err: any) {
      setError(describeSignupError(err?.message || ""));
      setLoading(false);
    }
  }

  // Animation variants
  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pt-0 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] space-y-6"
      >
        {/* Header & Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
           <Link href="/" className="flex items-center gap-3 group mb-2">
              <Image src="/image.png" alt="Edyfra Logo" width={36} height={36} className="w-9 h-9 rounded-xl shadow-lg object-cover" priority />
              <span className="text-3xl font-black text-foreground tracking-tighter">Edyfra</span>
           </Link>
           <h1 className="text-3xl font-black tracking-tightest">
              {step === 1 && "Let's get you started."}
              {step === 2 && "Tell us about yourself."}
              {step === 3 && "Pick a profile picture."}
           </h1>
           <p className="text-muted-foreground font-medium text-sm">
              {step === 1 && "Create your account and join a community that's here to help you succeed."}
              {step === 2 && "This helps us personalize your experience on the platform."}
              {step === 3 && "Choose how you want to be seen by your peers."}
           </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center items-center gap-2 mb-4">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                step >= i ? "w-8 bg-primary" : "w-4 bg-secondary"
              )}
            />
          ))}
        </div>

        {/* Form Container */}
        <div className="relative min-h-[380px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-5"
            >
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-sm"
                  role="alert"
                >
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="text-red-500 font-black">{error.title}</p>
                    <div className="space-y-1 text-foreground/85 leading-relaxed">
                      <p>
                        <span className="font-bold text-foreground/60 text-xs uppercase tracking-wider mr-1">Why:</span>
                        {error.cause}
                      </p>
                      <p>
                        <span className="font-bold text-foreground/60 text-xs uppercase tracking-wider mr-1">Try:</span>
                        {error.fix}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 1: BASICS */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Full Name</label>
                    <Input 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      type="text" 
                      required 
                      placeholder="Your Name" 
                      className="h-14 rounded-2xl px-6 border-border bg-secondary font-medium focus-visible:ring-primary" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Email Address</label>
                    <Input 
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError("");
                      }}
                      onBlur={() => {
                        if (email && !email.includes("@")) {
                          setEmailError("Please include an '@' in your email address to continue.");
                        }
                      }}
                      type="email" 
                      required 
                      placeholder="you@example.com" 
                      className={cn(
                        "h-14 rounded-2xl px-6 border-border bg-secondary font-medium focus-visible:ring-primary",
                        emailError && "border-red-500/50 focus-visible:ring-red-500"
                      )} 
                    />
                    {emailError && (
                      <p className="text-xs font-bold text-red-500/90 ml-4 animate-in fade-in slide-in-from-top-1">{emailError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Create Password</label>
                    <div className="relative">
                      <Input 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                </>
              )}

              {/* STEP 2: PERSONAL DETAILS */}
              {step === 2 && (
                <>
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

                  <div className="space-y-2 pt-4">
                     <label className="text-[10px] font-black uppercase tracking-widest ml-4 text-muted-foreground">Referral Code (optional)</label>
                     <Input
                       value={referralCode}
                       onChange={(e) => setReferralCode(e.target.value)}
                       type="text"
                       placeholder="e.g. MASH42"
                       maxLength={6}
                       className="h-14 rounded-2xl px-6 border-border bg-secondary font-medium focus-visible:ring-primary uppercase"
                     />
                     <p className="text-[9px] font-medium text-muted-foreground ml-4">Got a code from a friend? Enter it here for 50 bonus XP!</p>
                  </div>
                </>
              )}

              {/* STEP 3: AVATAR */}
              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <AvatarPicker
                      selected={avatarStyle}
                      onSelect={setAvatarStyle}
                      onSelectUrl={setAvatarUrl}
                      seed={name || "user"}
                      gender={gender.toLowerCase()}
                    />
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-2xl border border-border/50">
                    <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium leading-relaxed text-muted-foreground">
                       By creating an account, you agree to our <Link href="/terms" className="text-primary font-bold">Terms</Link> and <Link href="/privacy" className="text-primary font-bold">Privacy Policy</Link>.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 pt-4">
          {step > 1 && (
            <Button 
              type="button" 
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className="h-14 px-6 rounded-full border-2 hover:bg-secondary transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          {step < 3 ? (
            <Button 
              type="button" 
              onClick={handleNext}
              className="flex-1 h-14 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-xl transition-all active:scale-95"
            >
              Next Step <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex flex-col flex-1 gap-3">
              <Button 
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={loading || !avatarStyle}
                className="w-full h-14 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
              <Button 
                type="button"
                variant="ghost"
                onClick={(e) => handleSubmit(e, true)}
                disabled={loading}
                className="w-full h-10 rounded-full text-muted-foreground hover:text-foreground font-bold text-[10px] tracking-widest uppercase transition-colors"
              >
                Skip this step for now
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 1 && (
          <p className="text-center text-sm font-medium text-muted-foreground pt-4">
             Already have an account?{" "}
             <Link href="/login" className="text-primary font-black uppercase text-xs tracking-widest hover:underline decoration-2 underline-offset-4">Log in</Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
