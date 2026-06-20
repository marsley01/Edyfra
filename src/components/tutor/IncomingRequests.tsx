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

  useEffect(() => {
    loadRequests();

    // Real-time subscription for new booking requests
    const channel = supabase
      .channel("incoming-bookings")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter: `status=eq.pending`,
        },
        (payload: any) => {
          const newBooking = payload.new;
          // Fetch student details
          fetch(`/api/users/${newBooking.student_id}`)
            .then(res => res.json())
            .then(student => {
              setRequests(prev => {
                if (prev.find(r => r.id === newBooking.id)) return prev;
                return [{
                  ...newBooking,
                  student: { name: student.name || "Student", avatar: student.avatar },
                }, ...prev];
              });
              showInfo("New booking request", { description: "Someone just asked to book a session with you." });
            })
            .catch(() => {
              setRequests(prev => {
                if (prev.find(r => r.id === newBooking.id)) return prev;
                return [{
                  ...newBooking,
                  student: { name: "A student", avatar: "" },
                }, ...prev];
              });
            });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `status=in.(confirmed,declined,expired)`,
        },
        (payload: any) => {
          setRequests(prev => prev.filter(r => r.id !== payload.new.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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

  const handleAction = async (bookingId: string, action: "confirm" | "decline") => {
    try {
      await updateBookingStatus(bookingId, action === "confirm" ? "confirmed" : "declined");
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
                    onClick={() => handleAction(req.id, "decline")}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Decline
                  </Button>
                  <Button 
                    className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white"
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
