"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
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
    const channel = supabase
      .channel('global-matches')
      .on('broadcast', { event: 'new-request' }, ({ payload }: { payload: any }) => {
        // Only show requests that aren't from the current user
        supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
          if (user && payload.studentId !== user.id) {
            setRequests((prev) => [...prev, payload]);
            toast.info(`New help request: ${payload.studentName} needs ${payload.subject}!`);
            
            // Auto-remove after 45s
            setTimeout(() => {
              setRequests((prev) => prev.filter(r => r.requestId !== payload.requestId));
            }, 45000);
          }
        });
      })
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {

        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleAccept = async (requestId: string) => {
    try {
      const result = await acceptMatchRequest(requestId);
      if (result.success) {
        toast.success("Match accepted! Redirecting...");
        router.push(`/study-room/${result.sessionId}`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to accept match");
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
