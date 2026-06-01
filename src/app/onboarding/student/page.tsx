"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Loader2, BookOpen, MapPin, GraduationCap, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { EDUCATIONAL_SUBJECTS } from "@/utils/subjects";
import { cn } from "@/lib/utils";

export default function StudentOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    role: "STUDENT",
    educationLevel: "",
    curriculum: "8-4-4",
    formYear: "",
    county: "",
    subjects: [] as string[],
    weakTopics: [] as string[],
    studyStyle: "",
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

  const toggleWeakTopic = (s: string) => {
    setFormData(prev => ({
      ...prev,
      weakTopics: prev.weakTopics.includes(s) 
        ? prev.weakTopics.filter(sub => sub !== s)
        : [...prev.weakTopics, s]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await completeOnboarding(formData);
      if (result.success) {
        window.location.href = "/dashboard";
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const availableSubjects = formData.educationLevel === "UNIVERSITY" 
    ? EDUCATIONAL_SUBJECTS.UNIVERSITY 
    : EDUCATIONAL_SUBJECTS.HIGH_SCHOOL;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-12 selection:bg-primary/30 font-sans">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <Card className="w-full max-w-4xl border border-border/50 shadow-2xl rounded-[3rem] overflow-hidden bg-secondary/30 backdrop-blur-3xl relative z-10">
        <div className="h-2 bg-secondary w-full">
           <motion.div 
             className="h-full bg-primary shadow-[0_0_20px_rgba(139,92,246,0.5)]" 
             initial={{ width: "0%" }}
             animate={{ width: `${(step/5) * 100}%` }}
             transition={{ type: "spring", damping: 20 }}
           />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[650px]">
          {/* Sidebar Info */}
          <div className="lg:col-span-4 bg-primary p-12 text-white space-y-12 hidden lg:flex flex-col justify-between">
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tightest text-white">Your journey starts here.</h3>
                <p className="text-primary-foreground/70 font-medium text-sm leading-relaxed">
                  A few quick questions so we can personalise Edyfra just for you.
                </p>
              </div>
            </div>

            <div className="space-y-8">
               {[
                 { icon: BookOpen, text: "Top Study Resources" },
                 { icon: Sparkles, text: "AI Study Buddy" },
                 { icon: CheckCircle2, text: "Certified Growth" }
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
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Step 01 / 05</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tightest">Where are you in school?</h2>
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

                      {formData.educationLevel === "HIGH_SCHOOL" && (
                        <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Academic Curriculum</label>
                          <div className="flex flex-wrap gap-3">
                             {["8-4-4", "CBC"].map((curr) => (
                               <button
                                 key={curr}
                                 onClick={() => setFormData({...formData, curriculum: curr})}
                                 className={cn(
                                   "px-6 py-3 rounded-full border-2 transition-all font-black text-[10px] uppercase tracking-widest",
                                   formData.curriculum === curr ? "border-primary bg-primary text-white" : "border-border bg-background hover:border-primary/30"
                                 )}
                               >
                                 {curr}
                               </button>
                             ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Academic Year</label>
                        <Select onValueChange={(v: string | null) => v && setFormData({...formData, formYear: v})}>
                          <SelectTrigger className="h-16 rounded-2xl border-border bg-background font-bold px-8 text-lg">
                            <SelectValue placeholder={formData.educationLevel === "UNIVERSITY" ? "Select Year" : "Select Form/Grade"} />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border">
                            {[1,2,3,4,5,6].map(n => (
                              <SelectItem key={n} value={n.toString()} className="font-bold">
                                {formData.educationLevel === "UNIVERSITY" ? `Year ${n}` : `${formData.curriculum === "CBC" ? "Grade" : "Form"} ${n}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                   </div>
                   
                    <div className="pt-8 flex justify-end">
                      <Button 
                        disabled={!formData.educationLevel || !formData.formYear || (formData.educationLevel === "HIGH_SCHOOL" && !formData.curriculum)} 
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
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Step 02 / 05</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tightest">Which county are you in?</h2>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current County</label>
                      <Select onValueChange={(v: string | null) => v && setFormData({...formData, county: v})}>
                        <SelectTrigger className="h-20 rounded-[2rem] border-border bg-background font-black px-8 text-2xl">
                          <SelectValue placeholder="Select Zone" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border max-h-[300px]">
                          {["Nairobi", "Mombasa", "Nakuru", "Kisumu", "Uasin Gishu", "Kiambu", "Machakos", "Kakamega", "Meru", "Nyeri", "Kisii", "Trans Nzoia", "Bungoma", "Kilifi"].map(c => (
                            <SelectItem key={c} value={c} className="font-bold text-lg">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>

                    <div className="pt-12 flex justify-between gap-4">
                      <Button variant="ghost" onClick={prevStep} className="rounded-full h-16 px-10 font-black text-xs tracking-widest uppercase hover:bg-secondary transition-all">Back</Button>
                      <Button 
                        disabled={!formData.county} 
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
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Step 03 / 05</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tightest">What subjects are you taking?</h2>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Select Strong Subjects (Min 1)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {availableSubjects.map((s) => (
                            <button
                              key={s}
                              onClick={() => toggleSubject(s)}
                              className={cn(
                                "p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between group text-left",
                                formData.subjects.includes(s) 
                                  ? "border-primary bg-primary/5 shadow-sm" 
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

              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Step 04 / 05</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tightest">Which topics do you struggle with?</h2>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Select Subjects Needing Help</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {availableSubjects.map((s) => (
                            <button
                              key={s}
                              onClick={() => toggleWeakTopic(s)}
                              className={cn(
                                "p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between group text-left",
                                formData.weakTopics.includes(s) 
                                  ? "border-red-500 bg-red-500/5 shadow-sm" 
                                  : "border-border bg-background hover:border-red-500/50"
                              )}
                            >
                               <span className={cn(
                                 "text-[10px] font-black uppercase tracking-widest transition-colors",
                                 formData.weakTopics.includes(s) ? "text-red-500" : "text-muted-foreground group-hover:text-red-500"
                               )}>
                                 {s}
                               </span>
                               {formData.weakTopics.includes(s) && <CheckCircle2 className="h-5 w-5 text-red-500" />}
                            </button>
                          ))}
                        </div>
                      </div>
                   </div>

                    <div className="pt-8 flex justify-between gap-4">
                      <Button variant="ghost" onClick={prevStep} className="rounded-full h-16 px-10 font-black text-xs tracking-widest uppercase hover:bg-secondary transition-all">Back</Button>
                      <Button 
                        disabled={formData.weakTopics.length < 1} 
                        onClick={nextStep} 
                        className="flex-1 rounded-full h-16 font-black text-xs tracking-widest uppercase bg-red-600 hover:bg-red-700 text-white shadow-2xl shadow-red-600/20 transition-all active:scale-95"
                      >
                         Continue <ArrowRight className="ml-3 h-4 w-4" />
                      </Button>
                   </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Step 05 / 05</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tightest text-emerald-500">Almost done — how do you learn best?</h2>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Learning Methodology</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { id: "visual", label: "I learn by seeing", desc: "Diagrams, charts & visual notes" },
                            { id: "auditory", label: "I learn by listening", desc: "Explained concepts & discussions" },
                            { id: "group", label: "I learn with others", desc: "Study groups & peer discussions" },
                            { id: "solo", label: "I learn on my own", desc: "Quiet time & self-paced study" },
                          ].map((style) => (
                            <button
                              key={style.id}
                              onClick={() => setFormData({...formData, studyStyle: style.id})}
                              className={cn(
                                "p-6 rounded-2xl border transition-all duration-300 text-left group",
                                formData.studyStyle === style.id 
                                  ? "border-emerald-500 bg-emerald-500/5 shadow-xl shadow-emerald-500/5" 
                                  : "border-border bg-background hover:border-emerald-500/50"
                              )}
                            >
                               <p className={cn(
                                 "font-black text-[10px] uppercase tracking-widest mb-1 transition-colors",
                                 formData.studyStyle === style.id ? "text-emerald-600" : "text-foreground group-hover:text-emerald-500"
                               )}>{style.label}</p>
                               <p className="text-[9px] font-bold text-muted-foreground leading-tight uppercase tracking-widest">{style.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                   </div>

                    <div className="pt-8 flex justify-between gap-4">
                      <Button variant="ghost" onClick={prevStep} disabled={loading} className="rounded-full h-16 px-10 font-black text-xs tracking-widest uppercase hover:bg-secondary transition-all">Back</Button>
                      <Button 
                        onClick={handleSubmit} 
                        disabled={loading || !formData.studyStyle} 
                        className="flex-1 rounded-full h-16 font-black text-xs tracking-widest uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl shadow-emerald-600/20 transition-all active:scale-95"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Start My Journey"}
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
