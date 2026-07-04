"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Clock, Plus, ShieldCheck, Sparkles, Calendar, Trash2, Save, Loader2, X, Check
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTutorAvailability, saveTutorAvailability } from "@/app/actions/bookings";
import { toast } from "sonner";

interface Slot {
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  isBlocked: boolean;
}

type ScheduleState = Record<number, Slot[]>;

const DAYS: { name: string; dayOfWeek: number }[] = [
  { name: "Monday", dayOfWeek: 1 },
  { name: "Tuesday", dayOfWeek: 2 },
  { name: "Wednesday", dayOfWeek: 3 },
  { name: "Thursday", dayOfWeek: 4 },
  { name: "Friday", dayOfWeek: 5 },
  { name: "Saturday", dayOfWeek: 6 },
  { name: "Sunday", dayOfWeek: 0 },
];

export default function TutorSchedulePage() {
  const [autoOnline, setAutoOnline] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [newSlot, setNewSlot] = useState<{ startTime: string; endTime: string }>({
    startTime: "09:00",
    endTime: "10:00",
  });

  // Load existing availability on mount
  useEffect(() => {
    async function loadAvailability() {
      try {
        const data = await getTutorAvailability();
        const grouped: ScheduleState = {};
        DAYS.forEach((d) => (grouped[d.dayOfWeek] = []));
        if (data && Array.isArray(data)) {
          data.forEach((item: any) => {
            const dow = item.dayOfWeek;
            if (!grouped[dow]) grouped[dow] = [];
            grouped[dow].push({
              startTime: item.startTime,
              endTime: item.endTime,
              isRecurring: item.isRecurring ?? true,
              isBlocked: item.isBlocked ?? false,
            });
          });
        }
        // Sort each day's slots by startTime
        Object.keys(grouped).forEach((key) => {
          grouped[Number(key)].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });
        setSchedule(grouped);
      } catch {
        toast.error("Failed to load your availability.");
      } finally {
        setLoading(false);
      }
    }
    loadAvailability();
  }, []);

  // Add a slot to a specific day
  const addSlot = useCallback(
    (dayOfWeek: number) => {
      if (newSlot.startTime >= newSlot.endTime) {
        toast.error("Start time must be before end time.");
        return;
      }
      setSchedule((prev) => {
        const daySlots = prev[dayOfWeek] || [];
        // Check for overlapping slots
        const overlaps = daySlots.some(
          (s) => newSlot.startTime < s.endTime && newSlot.endTime > s.startTime
        );
        if (overlaps) {
          toast.error("This slot overlaps with an existing one.");
          return prev;
        }
        const updated = [
          ...daySlots,
          { startTime: newSlot.startTime, endTime: newSlot.endTime, isRecurring: true, isBlocked: false },
        ].sort((a, b) => a.startTime.localeCompare(b.startTime));
        return { ...prev, [dayOfWeek]: updated };
      });
      setExpandedDay(null);
      setNewSlot({ startTime: "09:00", endTime: "10:00" });
    },
    [newSlot]
  );

  // Remove a slot from a specific day
  const removeSlot = useCallback((dayOfWeek: number, index: number) => {
    setSchedule((prev) => {
      const daySlots = [...(prev[dayOfWeek] || [])];
      daySlots.splice(index, 1);
      return { ...prev, [dayOfWeek]: daySlots };
    });
  }, []);

  // Save all slots to the server
  const handleSave = async () => {
    setSaving(true);
    try {
      const allSlots: { day_of_week: number; start_time: string; end_time: string; is_recurring: boolean; is_blocked: boolean }[] = [];
      Object.entries(schedule).forEach(([dow, slots]) => {
        slots.forEach((slot) => {
          allSlots.push({
            day_of_week: Number(dow),
            start_time: slot.startTime,
            end_time: slot.endTime,
            is_recurring: slot.isRecurring,
            is_blocked: slot.isBlocked,
          });
        });
      });
      await saveTutorAvailability("", allSlots);
      toast.success("Schedule saved successfully!");
    } catch {
      toast.error("Failed to save schedule. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const totalSlots = Object.values(schedule).reduce((sum, s) => sum + s.length, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-in fade-in duration-700">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">Loading your schedule…</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans pb-20 p-2">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tightest">Your Schedule.</h1>
          <p className="text-muted-foreground text-lg font-medium">Define when you are ready to help students.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 px-8 py-5 rounded-[2rem] bg-secondary/50 border border-border backdrop-blur-md shadow-xl">
             <div className="flex flex-col">
                <Label htmlFor="auto-online" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary leading-none">Automatic Status</Label>
                <span className="text-xs font-bold text-muted-foreground mt-1">Go live based on schedule</span>
             </div>
             <Switch id="auto-online" checked={autoOnline} onCheckedChange={setAutoOnline} className="data-[state=checked]:bg-primary" />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-[4.5rem] px-10 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 transition-all"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "Saving…" : "Save Schedule"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-4">
            {DAYS.map(({ name, dayOfWeek }) => {
              const daySlots = schedule[dayOfWeek] || [];
              const isExpanded = expandedDay === dayOfWeek;

              return (
                <Card key={dayOfWeek} className="border-border bg-card/50 hover:bg-secondary/30 transition-all rounded-[2.5rem] overflow-hidden group">
                  <CardContent className="p-8">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                           <div className={cn(
                             "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest border transition-all",
                             daySlots.length > 0
                               ? "bg-primary text-white border-primary"
                               : "bg-secondary text-muted-foreground border-border group-hover:bg-primary group-hover:text-white group-hover:border-primary"
                           )}>
                              {name.substring(0, 3)}
                           </div>
                           <div>
                              <p className="font-black text-xl tracking-tight">{name}</p>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mt-1">
                                 <Clock className="h-3.5 w-3.5 text-primary" />
                                 {daySlots.length === 0
                                   ? "No slots set"
                                   : `${daySlots.length} slot${daySlots.length > 1 ? "s" : ""}`}
                              </p>
                           </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setExpandedDay(isExpanded ? null : dayOfWeek);
                            setNewSlot({ startTime: "09:00", endTime: "10:00" });
                          }}
                          className="h-14 px-8 rounded-2xl border-dashed border-2 border-border bg-transparent hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary font-black text-xs uppercase tracking-widest transition-all"
                        >
                          {isExpanded ? (
                            <>
                              <X className="h-4 w-4 mr-2" /> Cancel
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" /> Add Slot
                            </>
                          )}
                        </Button>
                     </div>

                     {/* Existing slots */}
                     {daySlots.length > 0 && (
                       <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border">
                         {daySlots.map((slot, idx) => (
                           <div
                             key={idx}
                             className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary/5 border border-primary/20 group/slot transition-all hover:bg-primary/10"
                           >
                             <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                             <span className="text-sm font-bold text-foreground">
                               {slot.startTime} – {slot.endTime}
                             </span>
                             <button
                               onClick={() => removeSlot(dayOfWeek, idx)}
                               className="ml-1 p-1.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                               aria-label="Remove slot"
                             >
                               <Trash2 className="h-3.5 w-3.5" />
                             </button>
                           </div>
                         ))}
                       </div>
                     )}

                     {/* Inline add-slot form */}
                     {isExpanded && (
                       <div className="mt-6 pt-6 border-t border-border animate-in slide-in-from-top-2 fade-in duration-300">
                         <div className="flex items-end gap-4 flex-wrap">
                           <div className="flex flex-col gap-1.5">
                             <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Start</Label>
                             <input
                               type="time"
                               value={newSlot.startTime}
                               onChange={(e) => setNewSlot((p) => ({ ...p, startTime: e.target.value }))}
                               className="h-14 px-5 rounded-2xl bg-secondary/50 border border-border text-foreground font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                             />
                           </div>
                           <div className="flex flex-col gap-1.5">
                             <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">End</Label>
                             <input
                               type="time"
                               value={newSlot.endTime}
                               onChange={(e) => setNewSlot((p) => ({ ...p, endTime: e.target.value }))}
                               className="h-14 px-5 rounded-2xl bg-secondary/50 border border-border text-foreground font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                             />
                           </div>
                           <Button
                             onClick={() => addSlot(dayOfWeek)}
                             className="h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all"
                           >
                             <Check className="h-4 w-4 mr-2" /> Add
                           </Button>
                         </div>
                       </div>
                     )}
                  </CardContent>
                </Card>
              );
            })}
         </div>

         <div className="space-y-8">
            {/* Summary card */}
            <Card className="border-border rounded-[3rem] bg-card/50 overflow-hidden">
              <CardContent className="p-10">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Schedule Summary</div>
                <div className="text-5xl font-black tracking-tightest text-primary mb-2">{totalSlots}</div>
                <p className="text-sm font-bold text-muted-foreground">
                  time slot{totalSlots !== 1 ? "s" : ""} across {Object.values(schedule).filter((s) => s.length > 0).length} day{Object.values(schedule).filter((s) => s.length > 0).length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-2xl rounded-[3rem] bg-card border border-border overflow-hidden relative">
               <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                  <Calendar className="h-48 w-48" />
               </div>
               <CardHeader className="p-10 pb-6 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/10">
                     <Sparkles className="h-7 w-7" />
                  </div>
                   <CardTitle className="text-3xl font-black tracking-tightest">How Matching Works</CardTitle>
                   <CardDescription className="text-muted-foreground font-medium text-lg mt-3 leading-relaxed">
                      Students see you when they need help during your available times.
                   </CardDescription>
               </CardHeader>
               <CardContent className="p-10 pt-0 space-y-8 relative z-10">
                   <div className="space-y-4">
                      <div className="flex items-start gap-4 p-8 rounded-[2rem] bg-primary/5 border border-primary/20">
                         <ShieldCheck className="h-6 w-6 text-primary mt-1 shrink-0" />
                         <p className="text-sm font-bold text-foreground leading-relaxed">
                            Consistency is key. Tutors with a regular weekly schedule get <span className="text-primary underline underline-offset-4 decoration-2">more session requests</span> because students know when to find them.
                         </p>
                      </div>
                   </div>
               </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}
