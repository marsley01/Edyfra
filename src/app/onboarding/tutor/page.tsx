"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { completeOnboarding } from "@/app/actions/onboarding";
import { 
  Loader2, BookOpen, Wallet, 
  GraduationCap, ArrowRight, CheckCircle2, 
  Sparkles, Phone, ShieldCheck, Search 
} from "lucide-react";
import { EDUCATIONAL_SUBJECTS } from "@/utils/subjects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TUTOR_CONFIG } from "@/lib/config";

export default function TutorOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [formData, setFormData] = useState({
    role: "TUTOR",
    educationLevel: "UNIVERSITY",
    curriculum: [] as string[],
    subjects: [] as string[],
    hourlyRate: TUTOR_CONFIG.DEFAULT_HOURLY_RATE_KSH.toString(),
    mpesaNumber: "",
    bio: "",
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const toggleSubject = (s: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(s) 
        ? prev.subjects.filter(sub => sub !== s)
        : [...prev.subjects, s]
    }));
  };

  const toggleCurriculum = (c: string) => {
    setFormData(prev => ({
      ...prev,
      curriculum: prev.curriculum.includes(c) 
        ? prev.curriculum.filter(curr => curr !== c)
        : [...prev.curriculum, c]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await completeOnboarding({
        ...formData,
        curriculum: formData.curriculum.join(", "),
        formYear: "1",
        county: "Nairobi",
        weakTopics: [],
        studyStyle: "solo",
        verificationPath: "GRADES",
      });
      if (result.success) {
        toast.success("Application Submitted!", {
          description: "Your tutor application is pending admin approval.",
        });
        // Redirect to pending status page instead of /tutor
        window.location.href = "/onboarding/tutor-pending";
      } else {
        toast.error("Application failed.", {
          description: result.error || "Please check your inputs.",
        });
        setLoading(false);
      }
    } catch (e: unknown) {
      toast.error("System error.", {
        description: (e as Error).message || "Please retry.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-12 selection:bg-primary/30 font-sans">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <Card className="w-full max-w-4xl border border-border/50 shadow-2xl rounded-[3rem] overflow-hidden bg-secondary/30 backdrop-blur-3xl relative z-10">
        <div className="h-2 bg-secondary w-full">
           <motion.div 
             className="h-full bg-primary shadow-[0_0_20px_rgba(139,92,246,0.5)]" 
             initial={{ width: "0%" }}
             animate={{ width: `${(step/3) * 100}%` }}
             transition={{ type: "spring", damping: 20 }}
           />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
          {/* Sidebar Info */}
          <div className="lg:col-span-4 bg-primary p-12 text-white space-y-12 hidden lg:flex flex-col justify-between">
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tightest">Help others succeed.</h3>
                <p className="text-primary-foreground/70 font-medium text-sm leading-relaxed">
                  We&apos;ll set up your tutor profile so students can find and book you.
                </p>
              </div>
            </div>

            <div className="space-y-8">
               {[
                 { icon: CheckCircle2, text: "Get a verified badge" },
                 { icon: Wallet, text: "Get paid weekly" },
                 { icon: Sparkles, text: "Powerful tutor tools" }
               ].map((item, i) => (
                 <div key={i} className="flex items-center gap-4">
                   <item.icon className="h-5 w-5 text-primary-foreground/40" />
                   <span className="text-[10px] font-black uppercase tracking-widest">{item.text}</span>
                 </div>
               ))}
            </div>
          </div>

          {/* Main Form Area */}
          <div className="lg:col-span-8 p-8 md:p-16 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Step 01 / 03</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tightest">Teaching Level.</h2>
                   </div>
                   
                   <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {["HIGH_SCHOOL", "UNIVERSITY"].map((level) => (
                           <button
                             key={level}
                             onClick={() => setFormData({...formData, educationLevel: level})}
                             className={cn(
                               "p-8 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col items-center gap-6 group relative overflow-hidden",
                               formData.educationLevel === level 
                                 ? "border-primary bg-primary/5 shadow-xl shadow-primary/5" 
                                 : "border-border bg-background hover:border-primary/50"
                             )}
                           >
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                                formData.educationLevel === level ? "bg-primary text-white" : "bg-secondary text-muted-foreground group-hover:text-primary"
                              )}>
                                 {level === "HIGH_SCHOOL" ? <BookOpen className="h-7 w-7" /> : <GraduationCap className="h-7 w-7" />}
                              </div>
                              <span className="font-black text-xs uppercase tracking-widest">
                                {level.replace("_", " ")}
                              </span>
                           </button>
                         ))}
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Expertise Framework</label>
                        <div className="flex flex-wrap gap-3">
                           {(formData.educationLevel === "HIGH_SCHOOL" ? ["8-4-4", "CBC"] : ["HEC", "International", "Technical"]).map((curr) => (
                             <button
                               key={curr}
                               onClick={() => toggleCurriculum(curr)}
                               className={cn(
                                 "px-6 py-3 rounded-full border-2 transition-all font-black text-[10px] uppercase tracking-widest",
                                 formData.curriculum.includes(curr) 
                                  ? "border-primary bg-primary text-white" 
                                  : "border-border bg-background hover:border-primary/30"
                               )}
                             >
                               {curr}
                             </button>
                           ))}
                        </div>
                      </div>
                   </div>
                   
                    <div className="pt-8 flex justify-end">
                      <Button 
                        disabled={formData.curriculum.length === 0} 
                        onClick={nextStep} 
                        className="rounded-full h-16 px-12 font-black text-xs tracking-widest uppercase bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all active:scale-95"
                      >
                         Continue <ArrowRight className="ml-3 h-4 w-4" />
                      </Button>
                   </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Step 02 / 03</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tightest">Your Subjects.</h2>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="relative">
                           <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                           <Input 
                             placeholder="Search disciplines..." 
                             className="h-16 pl-14 rounded-2xl border-border bg-background font-bold text-lg focus-visible:ring-primary"
                             value={subjectSearch}
                             onChange={(e) => setSubjectSearch(e.target.value)}
                           />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {(formData.educationLevel === "UNIVERSITY" ? EDUCATIONAL_SUBJECTS.UNIVERSITY : EDUCATIONAL_SUBJECTS.HIGH_SCHOOL)
                            .filter(s => s.toLowerCase().includes(subjectSearch.toLowerCase()))
                            .map((s) => (
                            <button
                              key={s}
                              onClick={() => toggleSubject(s)}
                              className={cn(
                                "p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between group",
                                formData.subjects.includes(s) 
                                  ? "border-primary bg-primary/5" 
                                  : "border-border bg-background hover:border-primary/50"
                              )}
                            >
                               <span className={cn(
                                 "text-[10px] font-black uppercase tracking-widest transition-colors",
                                 formData.subjects.includes(s) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                               )}>
                                 {s}
                               </span>
                               {formData.subjects.includes(s) && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            </button>
                          ))}
                        </div>
                      </div>
                   </div>

                    <div className="pt-8 flex justify-between gap-4">
                      <Button variant="ghost" onClick={prevStep} className="rounded-full h-16 px-10 font-black text-xs tracking-widest uppercase hover:bg-secondary transition-all">Back</Button>
                      <Button 
                        disabled={formData.subjects.length < 1} 
                        onClick={nextStep} 
                        className="flex-1 rounded-full h-16 font-black text-xs tracking-widest uppercase bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all active:scale-95"
                      >
                         Continue <ArrowRight className="ml-3 h-4 w-4" />
                      </Button>
                   </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Step 03 / 03</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tightest">Profile Details.</h2>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Withdrawal M-Pesa Number</Label>
                        <Input 
                          placeholder="07XX XXX XXX"
                          className="h-16 rounded-2xl border-border bg-background font-black px-8 focus-visible:ring-primary"
                          value={formData.mpesaNumber}
                          onChange={(e) => setFormData({ ...formData, mpesaNumber: e.target.value })}
                        />
                      </div>
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Professional Summary</Label>
                        <Textarea 
                          placeholder="Tell us about your teaching philosophy and academic track record..." 
                          className="min-h-[200px] rounded-[2.5rem] border-border bg-background font-bold p-10 focus-visible:ring-primary leading-relaxed text-lg"
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        />
                      </div>
                   </div>

                    <div className="pt-8 flex justify-between gap-4">
                      <Button variant="ghost" onClick={prevStep} disabled={loading} className="rounded-full h-16 px-10 font-black text-xs tracking-widest uppercase hover:bg-secondary transition-all">Back</Button>
                      <Button 
                        onClick={handleSubmit} 
                        disabled={loading || !formData.bio || !formData.mpesaNumber} 
                        className="flex-1 rounded-full h-16 font-black text-xs tracking-widest uppercase bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 transition-all active:scale-95"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Establish Profile"}
                      </Button>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </div>
  );
}
