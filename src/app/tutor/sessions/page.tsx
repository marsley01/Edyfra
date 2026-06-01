"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, MessageSquare, Clock, 
  User as UserIcon, Monitor, Play, Archive, Sparkles 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { getTutorSessions } from "@/app/actions/tutor";
import { formatDistanceToNow } from "date-fns";
import { Session } from "@/generated/client";

type SessionWithStudent = Session & { student: { name: string, avatar: string | null } };

export default function TutorSessionsPage() {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [sessions, setSessions] = useState<SessionWithStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [activeTab]);

  const fetchSessions = async () => {
    setLoading(true);
    const data = await getTutorSessions(activeTab === "active" ? "ACTIVE" : "COMPLETED");
    setSessions(data);
    setLoading(false);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tightest">Your Sessions.</h1>
          <p className="text-muted-foreground text-lg font-medium">Manage your teaching schedule and history.</p>
        </div>
        
        <div className="flex p-1.5 bg-secondary/50 backdrop-blur-md rounded-[1.5rem] border border-border">
           <button 
             onClick={() => setActiveTab("active")}
             className={cn(
               "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
               activeTab === "active" 
                 ? "bg-primary text-white shadow-lg shadow-primary/20" 
                 : "text-muted-foreground hover:text-foreground"
             )}
           >
             Upcoming
           </button>
           <button 
             onClick={() => setActiveTab("history")}
             className={cn(
               "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
               activeTab === "history" 
                 ? "bg-primary text-white shadow-lg shadow-primary/20" 
                 : "text-muted-foreground hover:text-foreground"
             )}
           >
             History
           </button>
        </div>
      </div>

      <div className="space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
               <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing your schedule...</p>
            </div>
          ) : sessions.length > 0 ? (
            sessions.map((session) => (
              <Card key={session.id} className="border-border bg-card/50 hover:bg-secondary/30 transition-all rounded-[3rem] overflow-hidden group">
                <CardContent className="p-0 flex flex-col lg:flex-row">
                   <div className="lg:w-72 bg-secondary/30 p-10 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-border">
                      <div className="w-20 h-20 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                         <UserIcon className="h-10 w-10" />
                      </div>
                      <p className="text-xl font-black text-center tracking-tight">{session.student?.name || "Student"}</p>
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-2">Scholar</p>
                   </div>
                   
                   <div className="flex-1 p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                      <div className="space-y-6">
                         <div className="flex items-center gap-3">
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] font-black uppercase tracking-widest px-3 py-1">
                              {session.status === "ACTIVE" ? "Ready to Start" : "Completed"}
                            </Badge>
                             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Monitor className="h-4 w-4" /> Online Session
                             </span>
                         </div>
                         <div className="space-y-2">
                            <h3 className="text-3xl font-black tracking-tightest">{session.subject}</h3>
                            <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-muted-foreground">
                               <span className="flex items-center gap-2">
                                 <Clock className="h-4 w-4 text-primary" /> 
                                 {session.startedAt ? formatDistanceToNow(new Date(session.startedAt)) : "Just now"} ago
                               </span>
                               <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> ID: {session.id.slice(0, 8)}</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto">
                         <Button variant="outline" size="icon" className="w-16 h-16 rounded-2xl border-border bg-secondary/50 hover:bg-secondary transition-all">
                            <MessageSquare className="h-6 w-6" />
                         </Button>
                         <Link href={`/study-room/${session.id}`} className="flex-1 md:flex-none">
                            <Button className="w-full h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs tracking-widest uppercase shadow-xl shadow-primary/20 transition-all active:scale-95 group">
                               Join Room <Play className="h-4 w-4 ml-2 fill-current group-hover:translate-x-1 transition-transform" />
                            </Button>
                         </Link>
                      </div>
                   </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="p-32 flex flex-col items-center justify-center text-center space-y-6 bg-secondary/30 rounded-[4rem] border border-dashed border-border">
               <div className="w-24 h-24 rounded-[2.5rem] bg-secondary flex items-center justify-center shadow-inner">
                   <Archive className="h-10 w-10 text-muted-foreground/30" />
               </div>
               <div className="space-y-2">
                   <h3 className="text-2xl font-black tracking-tightest">Nothing to show here yet.</h3>
                   <p className="text-muted-foreground font-medium max-w-xs mx-auto">Your {activeTab === "active" ? "upcoming" : "completed"} sessions will appear here once you start teaching.</p>
               </div>
            </div>
          )}
      </div>

      {/* Pro Tip */}
      <div className="flex items-center gap-6 p-10 rounded-[3rem] bg-card border border-border">
         <div className="w-16 h-16 rounded-[1.5rem] bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <Sparkles className="h-8 w-8" />
         </div>
         <div className="space-y-1">
            <h4 className="font-black text-lg tracking-tight">Pro Tip for Experts</h4>
            <p className="text-muted-foreground font-medium">Being ready 5 minutes early improves your student ratings and helps you build a loyal following.</p>
         </div>
      </div>
    </div>
  );
}
