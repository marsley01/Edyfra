"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, ShieldAlert, GraduationCap, 
  MapPin, Clock, Star, ExternalLink,
  CheckCircle2, XCircle, Search, Loader2
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export default function AdminTutorsPage() {
  const supabase = createClient();
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("User")
      .select("*, tutorProfile:tutorProfileId(*)")
      .eq("role", "TUTOR");
    
    if (data) setTutors(data);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    toast.success("Tutor approved and notified.");
    // In a real app, update DB status
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter">Verification Desk</h1>
          <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase italic">Audit and authorize educational experts for the community.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            placeholder="Search by name or subject..." 
            className="w-full bg-white/5 border border-white/5 rounded-2xl py-5 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : tutors.map((tutor) => (
          <Card key={tutor.id} className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2rem] overflow-hidden hover:border-primary/20 transition-all group">
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row lg:items-center">
                 {/* Profile Section */}
                 <div className="p-8 flex items-center gap-6 lg:border-r border-white/5 lg:min-w-[400px]">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl border border-primary/20 shadow-2xl shadow-primary/20">
                       {tutor.name[0]}
                    </div>
                    <div>
                       <h3 className="text-2xl font-black tracking-tight">{tutor.name}</h3>
                       <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black tracking-widest uppercase">
                            {tutor.educationLevel?.replace("_", " ")}
                          </Badge>
                          <span className="text-xs font-bold text-muted-foreground">Joined {new Date(tutor.createdAt).toLocaleDateString()}</span>
                       </div>
                    </div>
                 </div>

                 {/* Credentials */}
                 <div className="flex-1 p-8 grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Subjects</p>
                       <div className="flex flex-wrap gap-2">
                          {tutor.tutorProfile?.subjects?.map((s: string) => (
                             <Badge key={s} variant="outline" className="border-white/10 text-[9px] font-black tracking-widest">{s}</Badge>
                          ))}
                       </div>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Rate</p>
                       <p className="text-lg font-black text-primary">Ksh {tutor.tutorProfile?.hourlyRate}/hr</p>
                    </div>
                    <div className="hidden md:block">
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Bio Preview</p>
                       <p className="text-xs text-muted-foreground italic line-clamp-2">"{tutor.tutorProfile?.bio || "No biography provided yet."}"</p>
                    </div>
                 </div>

                 {/* Actions */}
                 <div className="p-8 bg-white/[0.01] flex items-center gap-3 lg:border-l border-white/5">
                    <Button 
                      onClick={() => handleApprove(tutor.id)}
                      className="rounded-xl font-black text-xs tracking-widest gap-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all px-6 py-6"
                    >
                       <CheckCircle2 className="h-4 w-4" /> APPROVE
                    </Button>
                    <Button 
                      variant="outline"
                      className="rounded-xl font-black text-xs tracking-widest gap-2 border-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all px-6 py-6"
                    >
                       <XCircle className="h-4 w-4" /> REJECT
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-white/5">
                       <ExternalLink className="h-5 w-5 text-muted-foreground" />
                    </Button>
                 </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
