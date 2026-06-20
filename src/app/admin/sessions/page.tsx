"use client";

import { useState, useEffect, useMemo } from "react";
import { getActiveSessions, closeSession, closeSessionsBatch } from "@/app/actions/admin";
import { 
  Zap, Clock, XCircle, Monitor, 
  User, BookOpen, Loader2, PlayCircle,
  Activity, Globe, Search, Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { showError, showSuccess } from "@/lib/toast";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000); // Auto refresh every 30s
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
      showSuccess("Session terminated", { description: "That session has been closed." });
      setSelectedSessions(prev => prev.filter(sId => sId !== id));
      fetchSessions();
    } catch (err) {
      showError({
        title: "We couldn't terminate that session",
        cause: "A hiccup on our side blocked it.",
        fix: "Try again, or refresh the page.",
      });
    }
  };

  const handleBatchClose = async () => {
    if (!confirm(`Are you sure you want to terminate ${selectedSessions.length} sessions?`)) return;
    try {
      await closeSessionsBatch(selectedSessions);
      showSuccess(`Terminated ${selectedSessions.length} sessions`, { description: "Those sessions are now closed." });
      setSelectedSessions([]);
      fetchSessions();
    } catch (err) {
      showError({
        title: "We couldn't terminate those sessions",
        cause: "A hiccup on our side blocked the batch close.",
        fix: "Try again, or refresh the page.",
      });
    }
  };

  const toggleSelectSession = (id: string) => {
    if (selectedSessions.includes(id)) {
      setSelectedSessions(selectedSessions.filter(sId => sId !== id));
    } else {
      setSelectedSessions([...selectedSessions, id]);
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => 
      (s.subject && s.subject.toLowerCase().includes(search.toLowerCase())) ||
      (s.topic && s.topic.toLowerCase().includes(search.toLowerCase())) ||
      (s.roomId && s.roomId.toLowerCase().includes(search.toLowerCase()))
    );
  }, [sessions, search]);

  const toggleSelectAll = () => {
    if (selectedSessions.length === filteredSessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(filteredSessions.map(s => s.id));
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
        <div className="flex flex-col sm:flex-row gap-4 items-center">
           <div className="relative group w-full sm:w-64">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
             <Input
               placeholder="Search subject or room..."
               className="h-12 pl-12 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 text-white"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>
           <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 whitespace-nowrap">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">{filteredSessions.length} Active Rooms</span>
           </div>
        </div>
      </div>

      {filteredSessions.length > 0 && (
        <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center gap-4">
            <Checkbox 
              id="select-all"
              checked={selectedSessions.length > 0 && selectedSessions.length === filteredSessions.length}
              onCheckedChange={toggleSelectAll}
              className="border-white/20 data-[state=checked]:bg-primary"
            />
            <label htmlFor="select-all" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">
              Select All
            </label>
          </div>
          {selectedSessions.length > 0 && (
            <div className="flex items-center gap-4 animate-in fade-in">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {selectedSessions.length} Selected
              </span>
              <Button 
                onClick={handleBatchClose}
                variant="destructive" 
                size="sm" 
                className="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" /> Terminate Selected
              </Button>
            </div>
          )}
        </div>
      )}

      {loading && sessions.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4">
           <Loader2 className="h-10 w-10 animate-spin text-primary" />
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scanning Network Clusters...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card className="border-dashed border-2 border-white/10 bg-transparent rounded-[3rem] py-32 text-center">
           <div className="space-y-4">
              <Globe className="h-12 w-12 text-muted-foreground/20 mx-auto" />
              <h3 className="text-xl font-black">{sessions.length === 0 ? "Zero Activity Detected." : "No matching sessions."}</h3>
              <p className="text-muted-foreground text-sm font-medium">
                {sessions.length === 0 ? "The platform is currently in a state of rest. No active sessions found." : "Try adjusting your search criteria."}
              </p>
           </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredSessions.map((session) => (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card className={`border-white/10 bg-black/40 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden group hover:border-primary/30 transition-all duration-500 shadow-2xl relative ${selectedSessions.includes(session.id) ? 'ring-2 ring-primary border-transparent' : ''}`}>
                  <div className="absolute top-6 left-6 z-10">
                    <Checkbox 
                      checked={selectedSessions.includes(session.id)}
                      onCheckedChange={() => toggleSelectSession(session.id)}
                      className="border-white/20 data-[state=checked]:bg-primary h-5 w-5"
                    />
                  </div>
                  <CardHeader className="p-8 pb-4 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between pl-8">
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
