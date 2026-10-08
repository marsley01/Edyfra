"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { showError, showSuccess, showInfo } from "@/lib/toast";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { getIncomingBookingRequests, updateBookingStatus } from "@/app/actions/bookings";
import { createClient } from "@/utils/supabase/client";

export function IncomingRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const [actingId, setActingId] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      const data = await getIncomingBookingRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // Real-time subscription for this tutor's booking requests only
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      const tutorId = data.user?.id;
      if (!tutorId || cancelled) return;
      channel = supabase
        .channel(`incoming-bookings-${tutorId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "bookings",
            filter: `tutor_id=eq.${tutorId}`,
          },
          (payload: any) => {
            if (payload.new?.status !== "pending") return;
            // Reload so the row has the same (camelCase + student) shape as the initial fetch
            loadRequests();
            showInfo("New booking request", { description: "Someone just asked to book a session with you." });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
            filter: `tutor_id=eq.${tutorId}`,
          },
          (payload: any) => {
            if (payload.new?.status !== "pending") {
              setRequests(prev => prev.filter(r => r.id !== payload.new.id));
            }
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const handleAction = async (bookingId: string, action: "confirm" | "decline") => {
    if (actingId) return;
    setActingId(bookingId);
    try {
      await updateBookingStatus(bookingId, action === "confirm" ? "confirmed" : "declined");
      setRequests(prev => prev.filter(r => r.id !== bookingId));
      showSuccess(action === "confirm" ? "Booking accepted" : "Booking declined", {
        description: action === "confirm" ? "The student will get a confirmation." : "We'll let the student know.",
      });
      loadRequests();
    } catch (err) {
      showError({
        title: `Couldn't ${action} the booking`,
        cause: "We didn't get a response from the server.",
        fix: "Give it another try, or refresh the page.",
      });
      loadRequests();
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-black tracking-tight text-xl flex items-center gap-2">
        Incoming Requests
        <span className="bg-destructive text-white text-xs px-2 py-0.5 rounded-full">
          {requests.length}
        </span>
      </h3>
      <div className="grid gap-4">
        {requests.map(req => (
          <Card key={req.id} className="border-destructive/20 bg-destructive/5 overflow-hidden animate-in slide-in-from-top-2">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <AvatarPremium seed={req.student?.name || "Student"} src={req.student?.avatar || ""} />
                  <div>
                    <p className="font-bold">{req.student?.name || "A student"} requested a session</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {req.subject} • {new Date(req.date).toLocaleDateString()} at {req.startTime} EAT ({req.durationMinutes} mins)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    className="flex-1 sm:flex-none border-destructive text-destructive hover:bg-destructive/10"
                    disabled={actingId !== null}
                    onClick={() => handleAction(req.id, "decline")}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Decline
                  </Button>
                  <Button 
                    className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white"
                    disabled={actingId !== null}
                    onClick={() => handleAction(req.id, "confirm")}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Accept
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
