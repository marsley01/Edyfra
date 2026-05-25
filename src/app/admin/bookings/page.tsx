// src/app/admin/bookings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getActiveSessions } from "@/app/actions/admin";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, BookOpen, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminBookingsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const data = await getActiveSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter">Tutor Bookings</h1>
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Real‑Time Booking Overview
          </div>
        </div>
        <Button variant="ghost" onClick={fetchSessions} className="rounded-full text-xs font-black uppercase tracking-widest">
          Refresh
        </Button>
      </div>

      {loading && sessions.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading bookings...</p>
        </div>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed border-2 border-white/10 bg-transparent rounded-[3rem] py-32 text-center">
          <div className="space-y-4">
            <Clock className="h-12 w-12 text-muted-foreground/20 mx-auto" />
            <h3 className="text-xl font-black">No Upcoming Bookings</h3>
            <p className="text-muted-foreground text-sm font-medium">All sessions are either completed or none scheduled.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Card key={session.id} className="border-white/10 bg-black/40 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden group hover:border-primary/30 transition-all duration-500 shadow-2xl">
              <CardHeader className="p-8 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[9px] tracking-widest px-3">ACTIVE</Badge>
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(session.startedAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" /> {session.subject}
                  </h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                    {session.topic || "General Session"}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Student</p>
                    <p className="text-xs font-black truncate">{session.studentId?.substring(0, 12)}...</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Tutor</p>
                    <p className="text-xs font-black truncate">{session.partnerId?.substring(0, 12) || "‑"}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Room: {session.roomId}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
