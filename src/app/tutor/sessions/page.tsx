"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Monitor, Calendar, User, 
  MessageSquare, Clock,
  Play, History
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TutorSessionsPage() {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  const sessions = [
    { id: 1, student: "Alice Kamau", subject: "Pure Mathematics", time: "Starts in 15 mins", duration: "60 mins", type: "LIVE", status: "READY" },
    { id: 2, student: "Brian Omondi", subject: "Quantum Physics", time: "Starts at 4:00 PM", duration: "45 mins", type: "LIVE", status: "SCHEDULED" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Teaching Log</h1>
          <p className="text-muted-foreground font-medium italic">Manage your active sessions and view teaching history.</p>
        </div>
        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
           <button 
             onClick={() => setActiveTab("active")}
             className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "active" ? "bg-white dark:bg-slate-800 shadow-sm text-teal-600" : "text-slate-500 hover:text-slate-700"}`}
           >
             Active
           </button>
           <button 
             onClick={() => setActiveTab("history")}
             className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "history" ? "bg-white dark:bg-slate-800 shadow-sm text-teal-600" : "text-slate-500 hover:text-slate-700"}`}
           >
             History
           </button>
        </div>
      </div>

      <div className="space-y-6">
         {activeTab === "active" ? (
           sessions.map((session) => (
             <Card key={session.id} className="border-none shadow-sm rounded-[2.5rem] overflow-hidden group hover:shadow-xl transition-all duration-500">
               <CardContent className="p-0 flex flex-col md:flex-row">
                  <div className="md:w-64 bg-slate-50 dark:bg-slate-900/50 p-8 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800">
                     <div className="w-16 h-16 rounded-3xl bg-teal-600/10 text-teal-600 flex items-center justify-center mb-4">
                        <User className="h-8 w-8" />
                     </div>
                     <p className="font-black text-center">{session.student}</p>
                     <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-widest">Scholar</p>
                  </div>
                  
                  <div className="flex-1 p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                     <div className="space-y-3">
                        <div className="flex items-center gap-2">
                           <Badge className="bg-teal-500 text-white border-none text-[8px] font-black uppercase tracking-widest">LIVE SESSION</Badge>
                           <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                              <Monitor className="h-3 w-3" /> Virtual Classroom
                           </span>
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">{session.subject}</h3>
                        <div className="flex items-center gap-6 text-sm font-bold text-slate-500">
                           <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> {session.time}</span>
                           <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {session.duration}</span>
                        </div>
                     </div>

                     <div className="flex gap-3">
                        <Button variant="outline" size="icon" className="w-14 h-14 rounded-2xl border-slate-200 hover:bg-slate-50">
                           <MessageSquare className="h-5 w-5" />
                        </Button>
                        <Button className="h-14 px-8 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs tracking-widest group">
                           LAUNCH ROOM <Play className="h-4 w-4 ml-2 fill-current" />
                        </Button>
                     </div>
                  </div>
               </CardContent>
             </Card>
           ))
         ) : (
           <div className="text-center py-20 space-y-4">
              <div className="w-20 h-20 rounded-[2rem] bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto opacity-50">
                 <History className="h-10 w-10 text-slate-400" />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No session history yet</p>
           </div>
         )}
      </div>
    </div>
  );
}
