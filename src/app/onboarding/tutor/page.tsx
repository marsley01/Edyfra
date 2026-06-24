"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Loader2, BookOpen, GraduationCap, ArrowRight, CheckCircle2, Sparkles, ShieldCheck, Search } from "lucide-react";
import { EDUCATIONAL_SUBJECTS } from "@/utils/subjects";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from "@/lib/toast";
import { createClient } from "@/utils/supabase/client";
import { useEffect } from "react";

export default function TutorOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [userName, setUserName] = useState<string>("Tutor");

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.name || user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.name || user.user_metadata.full_name);
      }
    };
    fetchUser();
  }, []);
  const [formData, setFormData] = useState({
    role: "TUTOR",
    educationLevel: "UNIVERSITY",
    curriculum: [] as string[],
    subjects: [] as string[],
    bio: "",
    kycName: "",
    kycIdNumber: "",
    kycInstitution: "",
    kycIdPhotoUrl: "",
    kycSelfieUrl: "",
    kycSchoolIdUrl: "",
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
        role: formData.role,
        educationLevel: formData.educationLevel,
        curriculum: formData.curriculum.join(", "),
        subjects: formData.subjects,
        bio: formData.bio,
        formYear: "1",
        county: "Nairobi",
        weakTopics: [],
        studyStyle: "solo",
        verificationPath: "GRADES",
        kycName: formData.kycName,
        kycIdNumber: formData.kycIdNumber,
        kycInstitution: formData.kycInstitution,
        kycIdPhotoUrl: formData.kycIdPhotoUrl,
        kycSelfieUrl: formData.kycSelfieUrl,
        kycSchoolIdUrl: formData.kycSchoolIdUrl,
      });
      if (result.success) {
        showSuccess("Application submitted", { description: "We'll review it and email you within a couple of business days." });
        // Redirect to pending status page instead of /tutor
        window.location.href = "/onboarding/tutor-pending";
      } else {
        showError({ title: "We couldn't submit that", cause: "Something went wrong on our side.", fix: "Try again in a moment." });
        setLoading(false);
      }
    } catch (e: unknown) {
      showError({ title: "System error", cause: "Something hiccuped on our side.", fix: "Try again, or refresh the page." });
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
             animate={{ width: `${(step/4) * 100}%` }}
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
                <h3 className="text-3xl font-black tracking-tightest">Help others succeed, {userName.split(' ')[0]}.</h3>
                <p className="text-primary-foreground/70 font-medium text-sm leading-relaxed">
                  We&apos;ll set up your tutor profile so students can find and book you.
                </p>
              </div>
            </div>

            <div className="space-y-8">
               {[
                 { icon: CheckCircle2, text: "Get a verified badge" },
                 { icon: ShieldCheck, text: "Join vetted tutors" },
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
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Step 01 / 04</p>
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
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Step 02 / 04</p>
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
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Step 03 / 04</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tightest">Identity Verification.</h2>
                      <p className="text-muted-foreground text-sm font-medium">To maintain a safe community, we need to verify who you are.</p>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Full Legal Name</Label>
                        <Input 
                          placeholder="As it appears on your ID" 
                          className="h-16 rounded-[2rem] border-border bg-background font-bold px-6 text-lg focus-visible:ring-primary"
                          value={formData.kycName}
                          onChange={(e) => setFormData({ ...formData, kycName: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">ID or Passport Number</Label>
                          <Input 
                            placeholder="e.g. 12345678" 
                            className="h-16 rounded-[2rem] border-border bg-background font-bold px-6 text-lg focus-visible:ring-primary"
                            value={formData.kycIdNumber}
                            onChange={(e) => setFormData({ ...formData, kycIdNumber: e.target.value })}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Institution Name</Label>
                          <Input 
                            placeholder="e.g. University of Nairobi" 
                            className="h-16 rounded-[2rem] border-border bg-background font-bold px-6 text-lg focus-visible:ring-primary"
                            value={formData.kycInstitution}
                            onChange={(e) => setFormData({ ...formData, kycInstitution: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">National ID / Passport Photo</Label>
                          <div className="flex items-center gap-4">
                             <Button 
                               variant="outline" 
                               className="h-16 rounded-[2rem] px-8 font-bold text-sm"
                               onClick={() => {
                                 setUploading(true);
                                 setTimeout(() => {
                                   setFormData({ ...formData, kycIdPhotoUrl: "https://mock-storage.url/id-photo.jpg" });
                                   setUploading(false);
                                 }, 1000);
                               }}
                               disabled={uploading}
                             >
                               {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Select File"}
                               {uploading ? "Uploading..." : formData.kycIdPhotoUrl ? "ID Uploaded" : "Upload ID Photo"}
                             </Button>
                             {formData.kycIdPhotoUrl && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Selfie Photo</Label>
                          <div className="flex items-center gap-4">
                             <Button 
                               variant="outline" 
                               className="h-16 rounded-[2rem] px-8 font-bold text-sm"
                               onClick={() => {
                                 setUploading(true);
                                 setTimeout(() => {
                                   setFormData({ ...formData, kycSelfieUrl: "https://mock-storage.url/selfie.jpg" });
                                   setUploading(false);
                                 }, 1000);
                               }}
                               disabled={uploading}
                             >
                               {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Select File"}
                               {uploading ? "Uploading..." : formData.kycSelfieUrl ? "Selfie Uploaded" : "Upload Selfie"}
                             </Button>
                             {formData.kycSelfieUrl && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">School / Institution ID</Label>
                          <div className="flex items-center gap-4">
                             <Button 
                               variant="outline" 
                               className="h-16 rounded-[2rem] px-8 font-bold text-sm"
                               onClick={() => {
                                 setUploading(true);
                                 setTimeout(() => {
                                   setFormData({ ...formData, kycSchoolIdUrl: "https://mock-storage.url/school-id.jpg" });
                                   setUploading(false);
                                 }, 1000);
                               }}
                               disabled={uploading}
                             >
                               {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Select File"}
                               {uploading ? "Uploading..." : formData.kycSchoolIdUrl ? "School ID Uploaded" : "Upload School ID"}
                             </Button>
                             {formData.kycSchoolIdUrl && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                          </div>
                        </div>
                      </div>
                   </div>

                    <div className="pt-8 flex justify-between gap-4">
                      <Button variant="ghost" onClick={prevStep} className="rounded-full h-16 px-10 font-black text-xs tracking-widest uppercase hover:bg-secondary transition-all">Back</Button>
                      <Button 
                        disabled={!formData.kycName || !formData.kycIdNumber || !formData.kycInstitution || !formData.kycIdPhotoUrl || !formData.kycSelfieUrl || !formData.kycSchoolIdUrl} 
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
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Step 04 / 04</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-tightest">Almost there — tell us about you.</h2>
                      <p className="text-muted-foreground text-sm font-medium">Write a short professional summary so students know what to expect from you.</p>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Professional Summary</Label>
                        <Textarea 
                          placeholder="e.g. I'm a 3rd year Medicine student at UoN with a passion for teaching Biology and Chemistry. I've helped over 20 students ace their exams..." 
                          className="min-h-[220px] rounded-[2rem] border-border bg-background font-bold p-8 focus-visible:ring-primary leading-relaxed text-base resize-none"
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        />
                        <p className="text-[10px] text-muted-foreground/60 font-bold ml-2">{formData.bio.length} / 500 characters</p>
                      </div>
                   </div>

                    <div className="pt-8 flex justify-between gap-4">
                      <Button variant="ghost" onClick={prevStep} disabled={loading} className="rounded-full h-16 px-10 font-black text-xs tracking-widest uppercase hover:bg-secondary transition-all">Back</Button>
                      <Button 
                        onClick={handleSubmit} 
                        disabled={loading || formData.bio.trim().length < 30} 
                        className="flex-1 rounded-full h-16 font-black text-xs tracking-widest uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl shadow-emerald-600/20 transition-all active:scale-95"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit My Application"}
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
