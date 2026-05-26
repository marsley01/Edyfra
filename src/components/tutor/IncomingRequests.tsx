"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AvatarPremium } from "@/components/ui/avatar-premium";

// Mock server actions (to be implemented in actions/bookings.ts)
import { getIncomingBookingRequests, updateBookingStatus } from "@/app/actions/bookings";

export function IncomingRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
    // Poll every minute
    const interval = setInterval(loadRequests, 60000);
    return () => clearInterval(interval);
  }, []);

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
      toast.success(action === "confirm" ? "Booking accepted!" : "Booking declined.");
      loadRequests();
    } catch (err) {
      toast.error(`Failed to ${action} booking.`);
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
    return null; // Don't show the widget if there are no requests
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
                  <AvatarPremium seed={req.student.name} src={req.student.avatar || ""} />
                  <div>
                    <p className="font-bold">{req.student.name} requested a session</p>
                    <p className="text-sm text-muted-foreground">
                      {req.subject} • {new Date(req.date).toLocaleDateString()} at {req.startTime} ({req.durationMinutes} mins)
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
