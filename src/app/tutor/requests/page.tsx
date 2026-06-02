"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { 
  Users,
  Clock, ArrowRight,
  Loader2, Zap, Filter
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { acceptMatchRequest, getTutorProfile } from "@/app/actions/tutor";

interface MatchRequest {
  id: string;
  subject: string;
  topic: string | null;
  createdAt: string | Date;
  sessionId: string | null;
}

export default function TutorRequestsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [tutorSubjects, setTutorSubjects] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    let channel: any;
    let broadcastChannel: any;

    const setup = async () => {
      const profile = await getTutorProfile();
      const subjects = (profile as any)?.subjects || [];
      setTutorSubjects(subjects);
      await fetchRequests(subjects);

      channel = supabase
        .channel("new-requests")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "MatchRequest" },
          (payload: any) => {
            const newReq = payload.new as MatchRequest;
            if (!newReq?.sessionId) {
              if (subjects.length === 0 || subjects.includes(newReq?.subject)) {
                setRequests((prev) => {
                  if (prev.find(r => r.id === newReq.id)) return prev;
                  return [newReq, ...prev];
                });
                toast.info(`New ${newReq?.subject} request detected!`);
              }
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "MatchRequest" },
          (payload: any) => {
            if (payload.new?.sessionId) {
              setRequests((prev) => prev.filter(req => req.id !== payload.new.id));
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "MatchRequest" },
          (payload: any) => {
            setRequests((prev) => prev.filter(req => req.id !== payload.old.id));
          }
        )
        .subscribe();

      broadcastChannel = supabase
        .channel('global-matches')
        .on('broadcast', { event: 'new-request' }, (payload: any) => {
          const newReq = {
            id: payload.payload.requestId,
            subject: payload.payload.subject,
            topic: payload.payload.topic,
            createdAt: new Date().toISOString()
          } as MatchRequest;

          if (subjects.length === 0 || subjects.includes(newReq.subject)) {
            setRequests((prev) => {
              if (prev.find(r => r.id === newReq.id)) return prev;
              return [newReq, ...prev];
            });
            toast.info(`Match Request: ${newReq.subject}`);
          }
        })
        .subscribe();
    };

    setup();

    return () => {
      supabase.removeChannel(channel);
      if (broadcastChannel) supabase.removeChannel(broadcastChannel);
    };
  }, [supabase]);

  const fetchRequests = async (subjects: string[] = []) => {
    setLoading(true);
    try {
      const { getFilteredMatchRequests } = await import("@/app/actions/match-algorithm");
      const data = await getFilteredMatchRequests(subjects);
      setRequests(data);
    } catch (err) {
      console.error("Failed to load match requests:", err);
      try {
        const { getFilteredMatchRequests } = await import("@/app/actions/match-algorithm");
        setRequests(await getFilteredMatchRequests(subjects));
      } catch {
        setRequests([]);
      }
    }
    setLoading(false);
  };

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    try {
      const result = await acceptMatchRequest(id);
      if (result.success) {
        toast.success("Match accepted! Entering room...");
        router.push(`/study-room/${result.sessionId}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to accept request.";
      toast.error(msg);
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
           <h1 className="text-3xl font-black tracking-tight">Student Requests</h1>
           <p className="text-muted-foreground font-medium">Students nearby who could use your help right now.</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="rounded-xl font-bold gap-2">
              <Filter className="h-4 w-4" /> All Subjects
           </Button>
           <Button className="rounded-xl font-black bg-teal-600 hover:bg-teal-700 gap-2">
              <Zap className="h-4 w-4" /> Live Mode
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
          </div>
        ) : requests.length > 0 ? (
          requests.map((req) => (
            <Card key={req.id} className="border-2 border-teal-600/5 hover:border-teal-600/20 transition-all bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm">
              <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-teal-600/10 text-teal-600 flex items-center justify-center font-black text-xl border border-teal-600/20">
                    {req.subject[0]}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-teal-600/10 text-teal-600 border-none text-[10px] font-black uppercase tracking-widest px-3">
                         {req.subject}
                      </Badge>
                      <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> 2m ago
                      </span>
                    </div>
                     <h3 className="text-xl font-bold">{req.topic || "General Help"}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                   <div className="flex-1 md:flex-none text-right pr-6 border-r border-slate-100 hidden sm:block">
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Subject</p>
                       <p className="text-lg font-black text-teal-600">{req.subject}</p>
                   </div>
                   <Button 
                      onClick={() => handleAccept(req.id)}
                      disabled={acceptingId === req.id}
                      className="flex-1 md:flex-none rounded-xl font-black py-7 px-8 bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20 gap-2"
                   >
                      {acceptingId === req.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>Accept Request <ArrowRight className="h-4 w-4" /></>
                      )}
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-24 space-y-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-teal-600/20">
             <div className="w-20 h-20 bg-teal-600/5 rounded-full flex items-center justify-center mx-auto border-2 border-teal-600/5">
                <Users className="h-10 w-10 text-teal-600/30" />
             </div>
              <div>
                 <h3 className="text-2xl font-black text-teal-600">All caught up</h3>
                 <p className="text-muted-foreground max-w-sm mx-auto font-medium">No students waiting right now. Stay online — someone will reach out soon.</p>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
