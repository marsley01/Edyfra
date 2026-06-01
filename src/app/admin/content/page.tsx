"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Edit3, Trash2, BookOpen, 
  Calendar, Award, Search, Loader2,
  ChevronRight, Sparkles, Filter
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export default function AdminContentPage() {
  const supabase = createClient();
  type Challenge = { id: string; date: string; question: string; subject: string; level: string };
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("DailyChallenge")
      .select("*")
      .order("date", { ascending: false });
    
    if (data) setChallenges(data);
    setLoading(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter">Challenge CMS</h1>
          <p className="text-muted-foreground text-sm font-bold tracking-widest uppercase italic">Curate the daily quest for the Edyfra scholar community.</p>
        </div>
        <Button className="rounded-2xl font-black gap-2 h-16 px-10 shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90">
          <Plus className="h-5 w-5" /> NEW CHALLENGE
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active List */}
        <Card className="lg:col-span-2 border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-white/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">Challenge Archive</CardTitle>
              <CardDescription>All-time history of academic quests.</CardDescription>
            </div>
            <div className="flex gap-2">
               <Button variant="outline" size="icon" className="rounded-xl border-white/10 bg-white/5"><Search className="h-4 w-4" /></Button>
               <Button variant="outline" size="icon" className="rounded-xl border-white/10 bg-white/5"><Filter className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y divide-white/5">
                {loading ? (
                   <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                ) : challenges.map((item) => (
                  <div key={item.id} className="p-8 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-3xl bg-white/5 text-primary flex flex-col items-center justify-center border border-white/10 group-hover:bg-primary/10 transition-colors">
                           <span className="text-xs font-black uppercase tracking-widest">{new Date(item.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                           <span className="text-xl font-black">{new Date(item.date).getDate()}</span>
                        </div>
                        <div>
                           <p className="font-black text-lg line-clamp-1">{item.question}</p>
                           <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest">{item.subject}</Badge>
                              <Badge variant="outline" className="border-white/10 text-[8px] font-black uppercase tracking-widest">{item.level}</Badge>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-white/10 text-muted-foreground"><Edit3 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                     </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>

        {/* Quick Insights */}
        <div className="space-y-8">
           <Card className="border-none bg-gradient-to-br from-primary to-primary/60 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-primary/30">
              <Sparkles className="h-12 w-12 mb-6 opacity-40" />
              <h3 className="text-3xl font-black leading-tight mb-4">AI Quest Generator</h3>
              <p className="text-white/80 font-medium mb-8">Let Mash AI generate a curriculum-aligned challenge for tomorrow based on student activity.</p>
              <Button className="w-full rounded-2xl bg-white text-primary font-black py-7 text-lg hover:bg-white/90">
                 GENERATE NOW
              </Button>
           </Card>

           <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] p-10">
              <h4 className="text-xl font-black mb-6 flex items-center gap-2">
                 <Calendar className="h-5 w-5 text-primary" /> Scheduling Status
              </h4>
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Today</span>
                    <Badge className="bg-green-500/10 text-green-500 border-none font-black tracking-widest">ACTIVE</Badge>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Tomorrow</span>
                    <Badge className="bg-orange-500/10 text-orange-500 border-none font-black tracking-widest">MISSING</Badge>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Next Week</span>
                    <Badge className="bg-white/5 text-muted-foreground border-none font-black tracking-widest">0 PLANNED</Badge>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
