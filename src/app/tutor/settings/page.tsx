"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, BookOpen, Loader2, Save,
  AlertCircle
} from "lucide-react";
import { getUserData } from "@/app/actions/user";
import { toast } from "sonner";

export default function TutorSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    subjects: "",
    hourlyRate: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const user = await getUserData();
    if (user && user.tutorProfile) {
      setFormData({
        name: user.name || "",
        bio: user.tutorProfile.bio || "",
        subjects: user.tutorProfile.subjects.join(", "),
        hourlyRate: user.tutorProfile.hourlyRate.toString(),
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulation of update action
    setTimeout(() => {
      setSaving(false);
      toast.success("Profile updated successfully!");
    }, 1500);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Expert Settings</h1>
          <p className="text-muted-foreground font-medium italic">Manage your public profile and rates.</p>
        </div>
        <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-none px-4 py-2 font-black uppercase tracking-widest text-[10px]">
           Verified Expert
        </Badge>
      </div>

      <form onSubmit={handleSave} className="space-y-8 pb-20">
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-slate-100 dark:border-slate-800">
             <CardTitle className="text-xl font-black flex items-center gap-2">
                <User className="h-5 w-5 text-teal-600" /> Basic Information
             </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-6">
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Display Name</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold" 
                />
             </div>
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Academic Bio</Label>
                <Textarea 
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="min-h-[120px] rounded-2xl border-slate-200 bg-slate-50 font-bold p-4" 
                />
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-slate-100 dark:border-slate-800">
             <CardTitle className="text-xl font-black flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-teal-600" /> Professional Expertise
             </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Teaching Subjects</Label>
                   <Input 
                     value={formData.subjects}
                     onChange={(e) => setFormData({...formData, subjects: e.target.value})}
                     className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold" 
                   />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Hourly Rate (Ksh)</Label>
                   <Input 
                     type="number"
                     value={formData.hourlyRate}
                     onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})}
                     className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold" 
                   />
                </div>
             </div>
             <div className="flex items-start gap-4 p-6 rounded-[1.5rem] bg-orange-500/5 border border-orange-500/10 mt-4">
                <AlertCircle className="h-5 w-5 text-orange-500 mt-1 shrink-0" />
                <p className="text-sm font-medium text-orange-800 leading-relaxed">
                   Changes to your subjects or rates may require a short review by our compliance team to ensure academic standards are maintained.
                </p>
             </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
           <Button 
             disabled={saving}
             className="h-16 px-12 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black tracking-widest shadow-xl shadow-teal-600/20"
           >
              {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
              SAVE PROFESSIONAL PROFILE
           </Button>
        </div>
      </form>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={className}>
      {children}
    </span>
  );
}
