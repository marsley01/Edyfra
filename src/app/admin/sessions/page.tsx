"use client";

import { useState, useEffect } from "react";
import { getActiveSessions, closeSession } from "@/app/actions/admin";
import { 
  Zap, Clock, XCircle, Monitor, 
  User, BookOpen, Loader2, PlayCircle,
  Activity, Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000); // Auto refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await getActiveSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm("Are you sure you want to terminate this live session?")) return;
    try {
      await closeSession(id);
      toast.success("Session terminated.");
      fetchSessions();
    } catch (err) {
      toast.error("Failed to terminate session.");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter">Live Sessions</h1>
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Real-Time Network Monitoring
          </div>
        </div>
        <div className="flex gap-4">
           <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">{sessions.length} Active Rooms</span>
           </div>
        </div>
      </div>

      {loading && sessions.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4">
           <Loader2 className="h-10 w-10 animate-spin text-primary" />
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scanning Network Clusters...</p>
        </div>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed border-2 border-white/10 bg-transparent rounded-[3rem] py-32 text-center">
           <div className="space-y-4">
              <Globe className="h-12 w-12 text-muted-foreground/20 mx-auto" />
              <h3 className="text-xl font-black">Zero Activity Detected.</h3>
              <p className="text-muted-foreground text-sm font-medium">The platform is currently in a state of rest. No active sessions found.</p>
           </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {sessions.map((session) => (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card className="border-white/10 bg-black/40 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden group hover:border-primary/30 transition-all duration-500 shadow-2xl">
                  <CardHeader className="p-8 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                       <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[9px] tracking-widest px-3">LIVE NOW</Badge>
                       <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          <Clock className="h-3 w-3" /> 
                          {Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000)}m Elapsed
                       </span>
                    </div>
                    <div className="space-y-1">
                       <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-primary" /> {session.subject}
                       </h3>
                       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{session.topic || "General Synchronization"}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Scholar ID</p>
                          <p className="text-xs font-black truncate">{session.studentId.substring(0, 12)}...</p>
                       </div>
                       <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Mentor ID</p>
                          <p className="text-xs font-black truncate">{session.partnerId?.substring(0, 12) || "FINDING..."}</p>
                       </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Monitor className="h-3.5 w-3.5 text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Room: {session.roomId}</span>
                       </div>
                       <Button 
                         onClick={() => handleClose(session.id)}
                         variant="ghost" 
                         size="sm" 
                         className="h-10 px-4 rounded-xl font-black text-[9px] tracking-widest uppercase text-red-500 hover:bg-red-500/10 transition-all"
                       >
                          <XCircle className="h-4 w-4 mr-2" /> Terminate
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
