"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Mock server actions for DB interaction (to be implemented in actual actions file)
import { getTutorAvailability, saveTutorAvailability } from "@/app/actions/bookings";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am to 11pm (23)

export function TutorAvailabilityCalendar({ tutorId }: { tutorId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<any[]>([]);
  // We'll store slots as "Day-Hour" like "1-14" for Monday 2pm
  const [selectedRecurring, setSelectedRecurring] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"recurring" | "specific">("recurring");

  useEffect(() => {
    loadAvailability();
  }, [tutorId]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const data = await getTutorAvailability(tutorId);
      setAvailability(data);
      
      const recurring = new Set<string>();
      data.forEach((slot: any) => {
        if (slot.is_recurring && !slot.is_blocked) {
          // Parse start_time "HH:mm" to hour
          const startHour = parseInt(slot.start_time.split(":")[0]);
          recurring.add(`${slot.day_of_week}-${startHour}`);
        }
      });
      setSelectedRecurring(recurring);
    } catch (err) {
      console.error("Failed to load availability", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (dayIndex: number, hour: number) => {
    const key = `${dayIndex}-${hour}`;
    const newSelected = new Set(selectedRecurring);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedRecurring(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert Set back to db structure
      const slotsToSave: any[] = [];
      selectedRecurring.forEach(key => {
        const [dayStr, hourStr] = key.split("-");
        const day = parseInt(dayStr);
        const hour = parseInt(hourStr);
        slotsToSave.push({
          day_of_week: day,
          start_time: `${hour.toString().padStart(2, '0')}:00`,
          end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
          is_recurring: true,
          is_blocked: false,
        });
      });

      await saveTutorAvailability(tutorId, slotsToSave);
      toast.success("Availability updated successfully");
    } catch (err) {
      toast.error("Failed to save availability");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-xl border border-border">
        <div className="space-y-1">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Weekly Recurring Schedule
          </h3>
          <p className="text-sm text-muted-foreground">
            Click on time slots (6 AM - 11 PM) to mark your availability. Green means available.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-primary text-white rounded-xl shadow-lg hover:shadow-primary/20"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Calendar
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px] border border-border rounded-xl overflow-hidden bg-background">
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b border-border bg-secondary/50">
            <div className="p-3 font-bold text-xs text-center border-r border-border text-muted-foreground uppercase tracking-wider">
              Time (EAT)
            </div>
            {DAYS.map((day, i) => (
              <div key={day} className={`p-3 font-bold text-sm text-center ${i !== 6 ? 'border-r border-border' : ''}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Time Slots Grid */}
          <div className="divide-y divide-border">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8">
                {/* Time Label */}
                <div className="p-2 border-r border-border bg-secondary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </span>
                </div>
                
                {/* Day Slots */}
                {DAYS.map((_, dayIndex) => {
                  const key = `${dayIndex}-${hour}`;
                  const isSelected = selectedRecurring.has(key);
                  return (
                    <div 
                      key={dayIndex}
                      onClick={() => toggleSlot(dayIndex, hour)}
                      className={`
                        p-2 border-r border-border cursor-pointer transition-colors duration-200 
                        ${isSelected 
                          ? "bg-emerald-500/20 hover:bg-emerald-500/30 border-l-2 border-l-emerald-500" 
                          : "bg-background hover:bg-secondary/50"}
                        ${dayIndex === 6 ? 'border-r-0' : ''}
                      `}
                    >
                      <div className={`w-full h-8 rounded-md transition-all ${isSelected ? "bg-emerald-500 shadow-sm shadow-emerald-500/20" : "bg-secondary/30"}`} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
