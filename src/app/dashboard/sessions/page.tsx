"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, Clock, User, ArrowRight, Loader2, MessageSquare, ExternalLink } from "lucide-react";
import { getUserData } from "@/app/actions/user";
import Link from "next/link";
import { format } from "date-fns";

import { User as PrismaUser, Session } from "@/generated/client";

interface SessionWithMessages extends Session {
  _count?: { messages: number };
  student?: { name: string };
  partner?: { name: string };
  createdAt: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<PrismaUser | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    const user = await getUserData();
    setUserData(user);

    if (user) {
      try {
        const { getUserSessions } = await import("@/app/actions/match");
         const data = await getUserSessions(user.id);
         setSessions(data.map(s => ({
           ...s,
           partner: s.partner || undefined,
           createdAt: s.startedAt?.toISOString() || new Date().toISOString()
         })));
       } catch (err) {
         console.error("Failed to fetch sessions:", err);
       }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Your Study History</h1>
          <p className="text-muted-foreground text-lg">Your past sessions, all in one place.</p>
        </div>
        <Link href="/dashboard/study">
          <Button className="rounded-xl gap-2 font-bold px-6">
            <BookOpen className="h-4 w-4" /> Start New Session
          </Button>
        </Link>
      </div>

      {sessions.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="group border-2 border-primary/5 hover:border-primary/20 transition-all overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-stretch">
                  {/* Date Sidebar */}
                  <div className="bg-primary/5 p-6 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-primary/10 min-w-[120px]">
                     <span className="text-xs font-black text-primary uppercase tracking-widest">{format(new Date(session.createdAt), "MMM")}</span>
                     <span className="text-3xl font-black text-primary">{format(new Date(session.createdAt), "dd")}</span>
                     <span className="text-[10px] font-bold text-muted-foreground">{format(new Date(session.createdAt), "yyyy")}</span>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest">{session.subject}</Badge>
                           <Badge variant="outline" className="text-[10px] font-bold uppercase">{session.status}</Badge>
                        </div>
                        <h3 className="text-xl font-bold">{session.topic || "General Discussion"}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                         <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-primary/60" />
                            {format(new Date(session.createdAt), "p")}
                         </div>
                         <div className="flex items-center gap-1.5">
                            <MessageSquare className="h-4 w-4 text-primary/60" />
                            {session._count?.messages || 0} Messages
                         </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-primary/5">
                       <div className="flex items-center gap-2">
                          <div className="bg-muted p-2 rounded-lg">
                             <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                             <p className="text-[10px] font-bold text-muted-foreground uppercase">Partner</p>
                             <p className="text-sm font-bold">
                               {session.partner?.name 
                                 ? (session.tier === "TUTOR" ? "Verified Tutor" : "Peer Student") 
                                 : "Mash AI Assistant"}
                             </p>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="p-4 flex items-center justify-center bg-primary/[0.02] border-t md:border-t-0 md:border-l border-primary/10">
                    <Link href={`/study-room/${session.roomId || session.id}`} className="w-full md:w-auto">
                      <Button variant="ghost" className="h-full w-full md:w-auto px-6 py-8 md:py-0 rounded-none group-hover:bg-primary/5 transition-colors flex flex-col md:flex-row gap-2">
                         <span className="text-sm font-bold text-primary">View Session</span>
                         <ExternalLink className="h-4 w-4 text-primary" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 space-y-6 bg-card/30 rounded-3xl border-2 border-dashed border-primary/10">
           <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto border-2 border-primary/5">
              <BookOpen className="h-10 w-10 text-primary/30" />
           </div>
           <div className="space-y-2">
               <h3 className="text-2xl font-bold text-primary">No sessions yet</h3>
               <p className="text-muted-foreground max-w-sm mx-auto italic">Match with a tutor or peer and your history will show up here.</p>
           </div>
           <Link href="/dashboard/study">
              <Button className="rounded-xl px-8 py-6 font-black text-lg shadow-xl shadow-primary/20">
                FIND YOUR FIRST MATCH
              </Button>
           </Link>
        </div>
      )}
    </div>
  );
}
