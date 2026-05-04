"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Clock, Plus, ShieldCheck, Sparkles
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function TutorSchedulePage() {
  const [autoOnline, setAutoOnline] = useState(false);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Availability Engine</h1>
          <p className="text-muted-foreground font-medium italic">Define when you are available for student matches.</p>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10">
           <Label htmlFor="auto-online" className="text-[10px] font-black uppercase tracking-widest text-teal-600">Auto-Online Mode</Label>
           <Switch id="auto-online" checked={autoOnline} onCheckedChange={setAutoOnline} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-6">
            {days.map((day) => (
              <Card key={day} className="border-none shadow-sm rounded-[2rem] overflow-hidden group hover:border-teal-500/30 transition-all">
                <CardContent className="p-8 flex items-center justify-between">
                   <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-black text-xs">
                         {day.substring(0, 3)}
                      </div>
                      <div>
                         <p className="font-black text-lg">{day}</p>
                         <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                            <Clock className="h-3 w-3" /> No slots defined
                         </p>
                      </div>
                   </div>
                   <Button variant="outline" className="h-12 px-6 rounded-xl border-dashed border-2 border-slate-200 hover:border-teal-500 text-slate-500 hover:text-teal-600 font-bold text-xs uppercase tracking-widest">
                      <Plus className="h-3 w-3 mr-2" /> Add Slot
                   </Button>
                </CardContent>
              </Card>
            ))}
         </div>

         <div className="space-y-6">
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-slate-900 text-white overflow-hidden">
               <CardHeader className="p-10 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-6">
                     <Sparkles className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl font-black">Smart Scheduling</CardTitle>
                  <CardDescription className="text-slate-400 font-medium pt-2">
                     Our AI matches you with students who study during your preferred times.
                  </CardDescription>
               </CardHeader>
               <CardContent className="p-10 pt-0 space-y-6">
                  <div className="space-y-4">
                     <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Match Priority</span>
                        <span className="text-xs font-bold text-teal-400">HIGH</span>
                     </div>
                     <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg. Discovery Rate</span>
                        <span className="text-xs font-bold text-teal-400">92%</span>
                     </div>
                  </div>
                  <div className="flex items-start gap-4 p-6 rounded-2xl bg-teal-600/20 border border-teal-600/30">
                     <ShieldCheck className="h-5 w-5 text-teal-400 mt-1 shrink-0" />
                     <p className="text-xs font-medium text-teal-100 leading-relaxed">
                        Setting a consistent schedule increases your match probability by up to 3x.
                     </p>
                  </div>
               </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}
