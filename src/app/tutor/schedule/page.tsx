"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Clock, Plus, ShieldCheck, Sparkles, Calendar
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function TutorSchedulePage() {
  const [autoOnline, setAutoOnline] = useState(false);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans pb-20 p-2">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tightest">Your Schedule.</h1>
          <p className="text-muted-foreground text-lg font-medium">Define when you are ready to help students.</p>
        </div>
        <div className="flex items-center gap-6 px-8 py-5 rounded-[2rem] bg-secondary/50 border border-border backdrop-blur-md shadow-xl">
           <div className="flex flex-col">
              <Label htmlFor="auto-online" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary leading-none">Automatic Status</Label>
              <span className="text-xs font-bold text-muted-foreground mt-1">Go live based on schedule</span>
           </div>
           <Switch id="auto-online" checked={autoOnline} onCheckedChange={setAutoOnline} className="data-[state=checked]:bg-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-4">
            {days.map((day) => (
              <Card key={day} className="border-border bg-card/50 hover:bg-secondary/30 transition-all rounded-[2.5rem] overflow-hidden group">
                <CardContent className="p-8 flex items-center justify-between">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-muted-foreground border border-border group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                         {day.substring(0, 3)}
                      </div>
                      <div>
                         <p className="font-black text-xl tracking-tight">{day}</p>
                         <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mt-1">
                            <Clock className="h-3.5 w-3.5 text-primary" /> No slots set
                         </p>
                      </div>
                   </div>
                   <Button variant="outline" className="h-14 px-8 rounded-2xl border-dashed border-2 border-border bg-transparent hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary font-black text-xs uppercase tracking-widest transition-all">
                      <Plus className="h-4 w-4 mr-2" /> Add Slot
                   </Button>
                </CardContent>
              </Card>
            ))}
         </div>

         <div className="space-y-8">
            <Card className="border-none shadow-2xl rounded-[3rem] bg-card border border-border overflow-hidden relative">
               <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                  <Calendar className="h-48 w-48" />
               </div>
               <CardHeader className="p-10 pb-6 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/10">
                     <Sparkles className="h-7 w-7" />
                  </div>
                   <CardTitle className="text-3xl font-black tracking-tightest">How Matching Works</CardTitle>
                   <CardDescription className="text-muted-foreground font-medium text-lg mt-3 leading-relaxed">
                      Students see you when they need help during your available times.
                   </CardDescription>
               </CardHeader>
               <CardContent className="p-10 pt-0 space-y-8 relative z-10">
                   <div className="space-y-4">
                      <div className="flex items-start gap-4 p-8 rounded-[2rem] bg-primary/5 border border-primary/20">
                         <ShieldCheck className="h-6 w-6 text-primary mt-1 shrink-0" />
                         <p className="text-sm font-bold text-foreground leading-relaxed">
                            Consistency is key. Tutors with a regular weekly schedule get <span className="text-primary underline underline-offset-4 decoration-2">more session requests</span> because students know when to find them.
                         </p>
                      </div>
                   </div>
               </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}
