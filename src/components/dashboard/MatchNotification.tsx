"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { showError, showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, X, Check } from "lucide-react";
import { acceptMatchRequest } from "@/app/actions/match";
import { getMatchViewerContext } from "@/app/actions/match-algorithm";
import { teachesSubject } from "@/lib/matching/tutor-ranking";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

interface MatchRequestPayload {
  requestId: string;
  studentId: string;
  studentName: string;
  subject: string;
  topic: string;
}

export default function MatchNotification() {
  const supabase = createClient();
  const router = useRouter();
  const [requests, setRequests] = useState<MatchRequestPayload[]>([]);

  useEffect(() => {
    let mounted = true;
    // Only verified tutors get live request toasts (getMatchViewerContext is
    // null for everyone else), and only for subjects they teach.
    // (Peer pairing is automatic now, and the broadcast payload is
    // client-supplied, so the server re-checks everything on accept.)
    let viewer: { id: string; role: string; subjects: string[] } | null = null;
    const ready = getMatchViewerContext()
      .then((v) => {
        viewer = v;
      })
      .catch(() => {
        viewer = null;
      });

    const channel = supabase
      .channel('global-matches')
      .on('broadcast', { event: 'new-request' }, async ({ payload }: { payload: any }) => {
        try {
          await ready;
          if (!mounted || !viewer || viewer.role !== "TUTOR") return;
          if (!payload?.requestId || typeof payload.subject !== "string") return;
          if (payload.studentId === viewer.id) return;
          if (!teachesSubject(viewer.subjects, payload.subject)) return;

          const safe: MatchRequestPayload = {
            requestId: String(payload.requestId),
            studentId: String(payload.studentId ?? ""),
            studentName: "A student",
            subject: String(payload.subject).slice(0, 80),
            topic: String(payload.topic ?? "General").slice(0, 120),
          };
          setRequests((prev) => (prev.some((r) => r.requestId === safe.requestId) ? prev : [...prev, safe]));

          // Requests are only offered for a short window; drop the toast after it.
          setTimeout(() => {
            if (mounted) {
              setRequests((prev) => prev.filter(r => r.requestId !== safe.requestId));
            }
          }, 45000);
        } catch (err) {
          console.error("Error handling match broadcast:", err);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleAccept = async (requestId: string) => {
    try {
      const result = await acceptMatchRequest(requestId);
      if (result.success) {
        showSuccess("Match accepted", { description: "Taking you into the room." });
        router.push(`/study-room/${result.sessionId}`);
        setRequests((prev) => prev.filter(r => r.requestId !== requestId));
      } else {
        // acceptMatchRequest reports failures (already taken, own request...) as
        // a result, not a throw — previously the click silently did nothing.
        showError({ title: "We couldn't accept that match", cause: result.error || "This request is no longer available.", fix: "Pick a different request." });
        setRequests((prev) => prev.filter(r => r.requestId !== requestId));
      }
    } catch (err: unknown) {
      const error = err as Error;
      showError({ title: "We couldn't accept that match", cause: error.message || "Something hiccuped on our side.", fix: "Try again, or pick a different request." });
      setRequests((prev) => prev.filter(r => r.requestId !== requestId));
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 space-y-2">
      <AnimatePresence>
        {requests.map((request) => (
          <motion.div
            key={request.requestId}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
          >
            <Card className="border-primary/50 bg-primary/5 shadow-lg overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-2">
                    <div className="bg-primary/20 p-2 rounded-full h-fit">
                      <Zap className="h-4 w-4 text-primary fill-current" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">A {request.subject} student needs help!</p>
                      <p className="text-xs text-muted-foreground">{request.topic}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setRequests(prev => prev.filter(r => r.requestId !== request.requestId))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    className="flex-1 gap-1"
                    onClick={() => handleAccept(request.requestId)}
                  >
                    <Check className="h-3 w-3" />
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setRequests(prev => prev.filter(r => r.requestId !== request.requestId))}
                  >
                    Ignore
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
