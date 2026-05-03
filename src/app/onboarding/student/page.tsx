"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Loader2, BookOpen, Sparkles, MapPin, GraduationCap } from "lucide-react";

export default function StudentOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    role: "STUDENT",
    educationLevel: "",
    formYear: "",
    county: "",
    subjects: [] as string[],
    weakTopics: [] as string[],
    studyStyle: "",
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await completeOnboarding(formData);
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-none shadow-2xl rounded-[3rem] overflow-hidden">
        <div className="h-2 bg-slate-100 w-full">
           <motion.div 
             className="h-full bg-primary" 
             initial={{ width: "33%" }}
             animate={{ width: `${(step/3) * 100}%` }}
           />
        </div>
        
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-12">
               <div className="text-center space-y-4 mb-10">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                     <GraduationCap className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-4xl font-black tracking-tight">Academic Level</h2>
                  <p className="text-muted-foreground font-medium text-lg">Where are you in your academic journey?</p>
               </div>
               
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Education Tier</label>
                    <Select onValueChange={(v: string | null) => v && setFormData({...formData, educationLevel: v})}>
                      <SelectTrigger className="h-16 rounded-2xl border-slate-200 bg-slate-50 font-bold"><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIGH_SCHOOL">High School (8-4-4 / CBC)</SelectItem>
                        <SelectItem value="UNIVERSITY">University / College</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Form / Year</label>
                    <Select onValueChange={(v: string | null) => v && setFormData({...formData, formYear: v})}>
                      <SelectTrigger className="h-16 rounded-2xl border-slate-200 bg-slate-50 font-bold"><SelectValue placeholder="Select form/year" /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4].map(n => <SelectItem key={n} value={n.toString()}>{formData.educationLevel === "HIGH_SCHOOL" ? `Form ${n}` : `Year ${n}`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
               </div>
               
               <div className="pt-10 flex justify-end">
                  <Button disabled={!formData.educationLevel || !formData.formYear} onClick={nextStep} className="rounded-2xl h-16 px-10 font-black text-sm tracking-widest">
                     CONTINUE SETUP
                  </Button>
               </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-12">
               <div className="text-center space-y-4 mb-10">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                     <MapPin className="h-8 w-8 text-blue-500" />
                  </div>
                  <h2 className="text-4xl font-black tracking-tight">Location Details</h2>
                  <p className="text-muted-foreground font-medium text-lg">This helps us match you with local study groups.</p>
               </div>

               <div className="space-y-2">
                  <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Current County</label>
                  <Select onValueChange={(v: string | null) => v && setFormData({...formData, county: v})}>
                    <SelectTrigger className="h-16 rounded-2xl border-slate-200 bg-slate-50 font-bold"><SelectValue placeholder="Select county" /></SelectTrigger>
                    <SelectContent>
                      {["Nairobi", "Mombasa", "Nakuru", "Kisumu", "Uasin Gishu", "Kiambu", "Machakos", "Kakamega", "Meru", "Nyeri"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>

               <div className="pt-10 flex justify-between">
                  <Button variant="ghost" onClick={prevStep} className="rounded-2xl font-bold">Back</Button>
                  <Button disabled={!formData.county} onClick={nextStep} className="rounded-2xl h-16 px-10 font-black text-sm tracking-widest">
                     CONTINUE SETUP
                  </Button>
               </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-12">
               <div className="text-center space-y-4 mb-10">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                     <BookOpen className="h-8 w-8 text-orange-500" />
                  </div>
                  <h2 className="text-4xl font-black tracking-tight">Study Preferences</h2>
                  <p className="text-muted-foreground font-medium text-lg">Almost there! Customize your learning experience.</p>
               </div>

               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Primary Subjects</label>
                    <Select onValueChange={(v: string | null) => v && setFormData({...formData, subjects: [v]})}>
                      <SelectTrigger className="h-16 rounded-2xl border-slate-200 bg-slate-50 font-bold"><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {["Mathematics", "Biology", "Chemistry", "Physics", "English"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Learning Style</label>
                    <Select onValueChange={(v: string | null) => v && setFormData({...formData, studyStyle: v})}>
                      <SelectTrigger className="h-16 rounded-2xl border-slate-200 bg-slate-50 font-bold"><SelectValue placeholder="Select style" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visual">Visual (Graphs & Diagrams)</SelectItem>
                        <SelectItem value="auditory">Auditory (Lectures & Discussion)</SelectItem>
                        <SelectItem value="group">Group Study (Collaborative)</SelectItem>
                        <SelectItem value="solo">Solo Study (Independent)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
               </div>

               <div className="pt-10 flex justify-between gap-4">
                  <Button variant="ghost" onClick={prevStep} disabled={loading} className="rounded-2xl font-bold">Back</Button>
                  <Button onClick={handleSubmit} disabled={loading || !formData.studyStyle} className="flex-1 rounded-2xl h-16 font-black text-sm tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "COMPLETE SETUP"}
                  </Button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
