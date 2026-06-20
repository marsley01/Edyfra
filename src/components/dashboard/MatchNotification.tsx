"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { showError, showSuccess, showInfo } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, X, Check } from "lucide-react";
import { acceptMatchRequest } from "@/app/actions/match";
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
    const channel = supabase
      .channel('global-matches')
      .on('broadcast', { event: 'new-request' }, async ({ payload }: { payload: any }) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (mounted && user && payload.studentId !== user.id) {
            setRequests((prev) => [...prev, payload]);
            showInfo(`New ${payload.subject} request`, { description: `${payload.studentName} is waiting for a tutor.` });
            
            // Auto-remove after 45s
            setTimeout(() => {
              if (mounted) {
                setRequests((prev) => prev.filter(r => r.requestId !== payload.requestId));
              }
            }, 45000);
          }
        } catch (err) {
          console.error("Error handling match broadcast:", err);
        }
      })
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          // Optional: could log subscription
        }
      });

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
                      <p className="text-sm font-bold">{request.studentName} needs help!</p>
                      <p className="text-xs text-muted-foreground">{request.subject} - {request.topic}</p>
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
