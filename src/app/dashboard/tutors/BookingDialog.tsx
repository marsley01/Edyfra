"use client";

import { useMemo, useState } from "react";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { showError, showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBooking } from "@/app/actions/bookings";
import type { TutorWithProfile } from "./types";

interface BookingDialogProps {
  tutor: TutorWithProfile;
}

interface TimeSlot {
  /** Unique value used by the <Select> ("YYYY-MM-DD|HH:mm") */
  value: string;
  /** Display label ("Mon, Jun 9 · 14:00") */
  label: string;
  /** Local YYYY-MM-DD — fed to createBooking */
  date: string;
  /** HH:mm — fed to createBooking */
  startTime: string;
}

const FORWARD_DAYS = 7;
const SLOT_DURATION_MIN = 60;

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildTimeSlots(
  availabilities: TutorWithProfile["tutorAvailabilities"],
): TimeSlot[] {
  if (!availabilities?.length) return [];

  const now = new Date();
  const slots: TimeSlot[] = [];

  for (let i = 1; i <= FORWARD_DAYS; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    day.setHours(0, 0, 0, 0);

    const dayOfWeek = day.getDay();
    const daySlots = availabilities.filter(
      (a) => a.dayOfWeek === dayOfWeek && !a.isBlocked,
    );

    for (const slot of daySlots) {
      const [h, m] = slot.startTime.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;

      const slotStart = new Date(day);
      slotStart.setHours(h, m, 0, 0);

      if (slotStart <= now) continue;

      const dateKey = toLocalDateKey(day);
      const label = `${day.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })} · ${slot.startTime}`;

      slots.push({
        value: `${dateKey}|${slot.startTime}`,
        label,
        date: dateKey,
        startTime: slot.startTime,
      });
    }
  }

  return slots.sort((a, b) => a.value.localeCompare(b.value));
}

export function BookingDialog({ tutor }: BookingDialogProps) {
  const [open, setOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [subject, setSubject] = useState(
    tutor.tutorProfile?.subjects?.[0] ?? "",
  );
  const [topic, setTopic] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  const timeSlots = useMemo(
    () => buildTimeSlots(tutor.tutorAvailabilities),
    [tutor.tutorAvailabilities],
  );

  const subjects = tutor.tutorProfile?.subjects ?? [];
  const canBook = Boolean(subject && topic.trim() && selectedSlot);

  const handleOpenChange = (next: boolean) => {
    if (booking) return;
    setOpen(next);
  };

  const handleBook = async () => {
    if (!canBook) {
      showError({
        title: "Please fill all fields",
        cause: "Subject, topic, and time slot are all required.",
        fix: "Fill in the missing fields, then try again.",
      });
      return;
    }
    const [date, startTime] = selectedSlot.split("|");
    if (!date || !startTime) {
      showError({
        title: "Please choose a valid time slot",
        cause: "We couldn't read the slot you picked.",
        fix: "Pick a time slot from the list and try again.",
      });
      return;
    }

    setBooking(true);
    try {
      const res = await createBooking(
        tutor.id,
        subject,
        topic,
        date,
        startTime,
        SLOT_DURATION_MIN,
      );
      if (res.success) {
        showSuccess("Session request sent!", {
          description: "The tutor will review and confirm your request.",
        });
        setOpen(false);
        setTopic("");
        setSelectedSlot("");
      } else {
        showError({
          title: "We couldn't book that session",
          cause: res.error || "The tutor didn't take the booking.",
          fix: "Try a different time slot, or refresh the page.",
        });
      }
    } catch {
      showError({
        title: "Something didn't go through",
        cause: "A hiccup on our side blocked this.",
        fix: "Give it another try in a few seconds.",
      });
    } finally {
      setBooking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="w-full h-12 rounded-xl font-black text-xs tracking-widest uppercase bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95">
            <Calendar className="mr-2 h-4 w-4" /> Book Session
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card border-border rounded-[2rem]">
        <DialogHeader className="p-8 pb-0">
          <DialogTitle className="text-3xl font-black tracking-tightest">
            Book {tutor.name}
          </DialogTitle>
          <p className="text-muted-foreground mt-2">
            Schedule a personalized learning session.
          </p>
        </DialogHeader>

        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Select Subject
            </label>
            {subjects.length > 0 ? (
              <Select value={subject} onValueChange={(v) => setSubject(v ?? "")}>
                <SelectTrigger className="h-14 rounded-xl border-border bg-background font-bold focus:ring-primary">
                  <SelectValue placeholder="Choose subject" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-background/95 backdrop-blur-xl">
                  {subjects.map((sub) => (
                    <SelectItem
                      key={sub}
                      value={sub}
                      className="font-bold cursor-pointer rounded-lg"
                    >
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter a subject"
                className="h-14 rounded-xl border-border bg-background font-bold"
              />
            )}
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Select Time Slot
            </label>
            {timeSlots.length === 0 ? (
              <div className="p-4 bg-secondary/30 border border-border rounded-xl text-center">
                <p className="text-sm font-bold text-muted-foreground">
                  Tutor has no available slots in the next 7 days.
                </p>
              </div>
            ) : (
              <Select value={selectedSlot} onValueChange={(v) => setSelectedSlot(v ?? "")}>
                <SelectTrigger className="h-14 rounded-xl border-border bg-background font-bold focus:ring-primary">
                  <SelectValue placeholder="Choose a time slot" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-background/95 backdrop-blur-xl max-h-[200px]">
                  {timeSlots.map((slot) => (
                    <SelectItem
                      key={slot.value}
                      value={slot.value}
                      className="font-bold cursor-pointer rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" /> {slot.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              What do you need help with?
            </label>
            <Textarea
              placeholder="List any specific topics, weak areas, or upcoming assignments..."
              className="min-h-[120px] rounded-xl border-border bg-background font-medium focus-visible:ring-primary p-4 resize-none"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={2000}
            />
          </div>

          <Button
            onClick={handleBook}
            disabled={booking || !canBook}
            className="w-full h-14 rounded-xl font-black text-sm tracking-widest uppercase bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            {booking ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Confirm Booking"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
