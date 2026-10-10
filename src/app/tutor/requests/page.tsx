"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Users, Clock, ArrowRight, Loader2, Zap, RefreshCcw, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { showError, showSuccess, showInfo } from "@/lib/toast";
import { acceptMatchRequest, declineMatchOffer } from "@/app/actions/match";
import { getFilteredMatchRequests } from "@/app/actions/match-algorithm";
import type { TutorFeedRequest } from "@/app/actions/match-engine";

/** Feed refresh while the tab is visible — offers last ~12s, so keep this short. */
const POLL_MS = 4_000;

function timeAgo(date: string | Date, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(date).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return `${m}m ago`;
}

const LEVEL_LABEL: Record<string, string> = { HIGH_SCHOOL: "High School", UNIVERSITY: "University" };

export default function TutorRequestsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [requests, setRequests] = useState<TutorFeedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const seq = useRef(0);
  const announced = useRef(new Set<string>());

  const fetchRequests = useCallback(async () => {
    const mine = ++seq.current;
    setRefreshing(true);
    try {
      const data = await getFilteredMatchRequests();
      if (mine !== seq.current) return;
      setRequests(data);
      for (const r of data) {
        if (r.offeredToMe && !announced.current.has(r.id)) {
          announced.current.add(r.id);
          showInfo(`${r.subject} request offered to you`, { description: "Accept before the timer runs out." });
        }
      }
    } catch (err) {
      console.error("Failed to load match requests:", err);
    } finally {
      if (mine === seq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Initial load + polling (paused while the tab is hidden).
  useEffect(() => {
    fetchRequests();
    const id = setInterval(() => {
      if (!document.hidden) fetchRequests();
    }, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(id);
      clearInterval(tick);
    };
  }, [fetchRequests]);

  // Realtime nudges: any change to MatchRequest just triggers a refetch, so
  // the server stays the single source of truth for subject filtering,
  // expiry and offer exclusivity.
  useEffect(() => {
    const channel = supabase
      .channel("new-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "MatchRequest" }, () => fetchRequests())
      .subscribe();
    const broadcast = supabase
      .channel("global-matches")
      .on("broadcast", { event: "new-request" }, () => fetchRequests())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcast);
    };
  }, [supabase, fetchRequests]);

  const handleAccept = async (id: string) => {
    setBusyId(id);
    try {
      const result = await acceptMatchRequest(id);
      if (result.success) {
        showSuccess("Match accepted!", { description: "Taking you into the room." });
        router.push(`/study-room/${result.sessionId}`);
        return;
      }
      showError({
        title: "We couldn't accept that match",
        cause: result.error || "Something blocked the request on our side.",
        fix: "Try again, or pick a different request.",
      });
      fetchRequests();
    } catch (err) {
      showError({
        title: "We couldn't accept that match",
        cause: err instanceof Error ? err.message : "Failed to accept request.",
        fix: "Try again, or pick a different request.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (id: string) => {
    setBusyId(id);
    try {
      await declineMatchOffer(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showInfo("Passed", { description: "We'll offer it to another tutor." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Student Requests</h1>
          <p className="text-muted-foreground font-medium">
            Students waiting right now in subjects you teach. Requests offered to you are reserved for a few seconds.
          </p>
        </div>
        <Button variant="outline" className="rounded-xl font-bold gap-2" onClick={fetchRequests} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
          </div>
        ) : requests.length > 0 ? (
          requests.map((req) => {
            const secondsLeft = req.offerExpiresAt
              ? Math.max(0, Math.ceil((new Date(req.offerExpiresAt).getTime() - now) / 1000))
              : null;
            return (
              <Card
                key={req.id}
                className={`border-2 transition-all bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm ${
                  req.offeredToMe ? "border-teal-600/60 shadow-teal-600/10" : "border-teal-600/5 hover:border-teal-600/20"
                }`}
              >
                <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="w-16 h-16 shrink-0 rounded-2xl bg-teal-600/10 text-teal-600 flex items-center justify-center font-black text-xl border border-teal-600/20">
                      {req.subject?.[0]}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-teal-600/10 text-teal-600 border-none text-[10px] font-black uppercase tracking-widest px-3">
                          {req.subject}
                        </Badge>
                        {req.offeredToMe && (
                          <Badge className="bg-teal-600 text-white border-none text-[10px] font-black uppercase tracking-widest px-3 gap-1">
                            <Zap className="h-3 w-3" /> Offered to you{secondsLeft !== null ? ` · ${secondsLeft}s` : ""}
                          </Badge>
                        )}
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {timeAgo(req.createdAt, now)}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold truncate">{req.topic || "General Help"}</h3>
                      <p className="text-xs font-medium text-muted-foreground">
                        {req.studentFirstName}
                        {req.studentLevel ? ` · ${LEVEL_LABEL[req.studentLevel] ?? req.studentLevel}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {req.offeredToMe && (
                      <Button
                        variant="outline"
                        onClick={() => handleDecline(req.id)}
                        disabled={busyId === req.id}
                        className="rounded-xl font-bold py-7 px-5 gap-2"
                      >
                        <X className="h-4 w-4" /> Pass
                      </Button>
                    )}
                    <Button
                      onClick={() => handleAccept(req.id)}
                      disabled={busyId === req.id}
                      className="flex-1 md:flex-none rounded-xl font-black py-7 px-8 bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20 gap-2"
                    >
                      {busyId === req.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Accept Request <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-24 space-y-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-teal-600/20">
            <div className="w-20 h-20 bg-teal-600/5 rounded-full flex items-center justify-center mx-auto border-2 border-teal-600/5">
              <Users className="h-10 w-10 text-teal-600/30" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-teal-600">All caught up</h3>
              <p className="text-muted-foreground max-w-sm mx-auto font-medium">
                No students waiting right now. Stay online and requests in your subjects will show up here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
