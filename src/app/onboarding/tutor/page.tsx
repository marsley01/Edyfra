"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  GraduationCap, BookOpen, Clock, 
  Wallet, ShieldCheck, Loader2, Sparkles 
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export default function TutorOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subjects: "",
    hourlyRate: "500",
    bio: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // In a real app, call a server action to create the TutorProfile in Prisma
      // For now, we'll simulate the completion and redirect
      
      // We'll use a fetch call to a mock internal API or just simulate
      await new Promise(r => setTimeout(r, 1500));

      toast.success("Application submitted! An admin will review your profile shortly.");
      router.push("/tutor"); // Tutors land in their dashboard (it handles the pending state)
    } catch (error) {
      toast.error("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="p-12 text-center bg-teal-600 text-white">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
               <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-4xl font-black tracking-tight">Expert Verification</CardTitle>
            <CardDescription className="text-teal-50 font-medium text-lg mt-2">Tell us about your academic expertise.</CardDescription>
          </CardHeader>
          
          <CardContent className="p-12 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <BookOpen className="h-4 w-4 text-teal-600" />
                   <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Expert Subjects</Label>
                </div>
                <Input 
                  required
                  placeholder="e.g. Mathematics, Physics, Computer Science" 
                  className="h-16 rounded-2xl border-slate-200 bg-slate-50 font-bold"
                  value={formData.subjects}
                  onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                />
                <p className="text-xs text-muted-foreground font-medium italic">Separate subjects with commas. We currently prioritize STEM subjects.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <Wallet className="h-4 w-4 text-teal-600" />
                       <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Hourly Rate (Ksh)</Label>
                    </div>
                    <Input 
                      required
                      type="number"
                      className="h-16 rounded-2xl border-slate-200 bg-slate-50 font-bold"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    />
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <Clock className="h-4 w-4 text-teal-600" />
                       <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Commitment</Label>
                    </div>
                    <div className="h-16 flex items-center px-6 rounded-2xl bg-teal-50 text-teal-700 font-bold text-sm">
                       Verified On-Demand
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <Sparkles className="h-4 w-4 text-teal-600" />
                   <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Short Academic Bio</Label>
                </div>
                <Textarea 
                  required
                  placeholder="Tell students about your teaching experience and academic background..." 
                  className="min-h-[150px] rounded-2xl border-slate-200 bg-slate-50 font-bold p-6"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div className="pt-6">
                <Button 
                  disabled={loading}
                  className="w-full h-18 rounded-3xl bg-teal-600 hover:bg-teal-700 text-white font-black text-lg tracking-widest shadow-xl shadow-teal-600/20 py-8"
                >
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "SUBMIT APPLICATION"}
                </Button>
                <div className="flex items-center justify-center gap-2 mt-6 text-xs font-bold text-muted-foreground">
                   <ShieldCheck className="h-4 w-4 text-teal-600" />
                   All expert applications are reviewed by the Edyfra Compliance Team.
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
