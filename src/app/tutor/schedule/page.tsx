"use client";

import { useState, useEffect } from "react";
import { Loader2, CalendarDays, Settings, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getUpcomingBookings, getIncomingBookingRequests, getTutorAvailability } from "@/app/actions/bookings";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(startTime: string, endTime: string) {
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
  };
  return `${fmt(startTime)} – ${fmt(endTime)}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" });
}

export default function TutorSchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookingsData, pendingData, availData] = await Promise.all([
        getUpcomingBookings(),
        getIncomingBookingRequests(),
        getTutorAvailability(),
      ]);
      setBookings(bookingsData);
      setPending(pendingData);
      setAvailability(availData);
    } catch (err) {
      console.error("Failed to load schedule:", err);
    }
    setLoading(false);
  };

  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2 sm:p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold">Schedule</h1>
          <p className="text-sm text-muted-foreground">Your upcoming sessions and weekly availability.</p>
        </div>
        <Button
          onClick={() => router.push("/tutor/settings")}
          variant="outline"
          className="h-10 px-4 rounded-xl text-sm font-medium gap-2"
        >
          <Settings className="h-4 w-4" />
          Set Availability
        </Button>
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Pending Requests</h2>
          <div className="grid gap-2">
            {pending.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 font-semibold shrink-0">
                  {req.student?.name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{req.student?.name || "Student"}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.subject} — {formatDate(new Date(req.date))} at {formatTime(req.startTime, req.endTime)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push("/tutor")}
                  className="h-9 px-4 rounded-xl text-xs font-medium gap-1"
                >
                  Review <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {weekDays.map((day) => {
          const dayBookings = bookings.filter((b) => {
            const bDate = new Date(b.date);
            return bDate.toDateString() === day.toDateString();
          });

          const dayAvail = availability.filter((a) => a.day_of_week === day.getDay());

          const isToday = day.toDateString() === today.toDateString();

          return (
            <div
              key={day.toISOString()}
              className={`rounded-2xl border overflow-hidden ${
                isToday ? "border-primary/30 bg-primary/5" : "border-border"
              }`}
            >
              <div className={`px-5 py-3 flex items-center justify-between ${
                isToday ? "bg-primary/10" : "bg-secondary/30"
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${
                    isToday ? "text-primary" : "text-foreground"
                  }`}>
                    {formatDate(day)}
                  </span>
                  {isToday && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[11px] font-medium text-primary">
                      Today
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {dayBookings.length} session{dayBookings.length !== 1 ? "s" : ""}
                </span>
              </div>

              {dayBookings.length > 0 ? (
                <div className="divide-y divide-border">
                  {dayBookings.map((b) => (
                    <div key={b.id} className="px-5 py-3 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium shrink-0">
                        {b.student?.name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.student?.name}</p>
                        <p className="text-xs text-muted-foreground">{b.subject}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(b.startTime, b.endTime)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-4 text-sm text-muted-foreground/60">
                  {dayAvail.length > 0 ? "Available — no bookings yet" : "No availability set"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {bookings.length === 0 && pending.length === 0 && (
        <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
          <CalendarDays className="h-12 w-12 text-muted-foreground/20" />
          <div className="space-y-1">
            <p className="text-base font-medium">No upcoming sessions</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Set your availability in settings so students know when to find you.
            </p>
          </div>
          <Button
            onClick={() => router.push("/tutor/settings")}
            className="h-11 px-6 rounded-xl text-sm font-medium mt-2"
          >
            Set Your Availability
          </Button>
        </div>
      )}
    </div>
  );
}
