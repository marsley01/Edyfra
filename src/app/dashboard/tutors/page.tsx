"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { findTutors, type TutorDirectoryEntry } from "@/app/actions/search";
import { useDebounced } from "@/hooks/use-debounced";
import { createBooking } from "@/app/actions/bookings";
import { EduLevel } from "@/generated/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import VerifiedBadge from "@/components/ui/verified-badge";
import { Loader2, Star, CheckCircle2, Clock, Calendar, Search } from "lucide-react";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { slotOverlapsBlock } from "@/lib/booking-slots";

const LEVELS: { value: EduLevel | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Levels" },
  { value: "HIGH_SCHOOL", label: "High School" },
  { value: "UNIVERSITY", label: "University" },
];

export default function TutorsPage() {
  const [tutors, setTutors] = useState<TutorDirectoryEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState<EduLevel | "ALL">("ALL");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const router = useRouter();

  const debouncedSearch = useDebounced(search.trim(), 300);
  const debouncedSubject = useDebounced(subject.trim(), 300);
  // Drop responses from superseded requests (typing fast, toggling filters).
  const seq = useRef(0);

  // Deep link from people search: /dashboard/tutors?q=Jane
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) setSearch(q.slice(0, 80));
    } catch {
      /* ignore */
    }
  }, []);

  const input = useMemo(
    () => ({
      query: debouncedSearch.length >= 2 ? debouncedSearch : "",
      subject: debouncedSubject,
      level,
      onlineOnly,
      limit: 12,
    }),
    [debouncedSearch, debouncedSubject, level, onlineOnly],
  );

  useEffect(() => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    findTutors({ ...input, cursor: null })
      .then((res) => {
        if (mine !== seq.current) return;
        if (res.error) {
          setError(res.error);
          setTutors([]);
          setNextCursor(null);
          setTotal(0);
          return;
        }
        setTutors(res.items);
        setNextCursor(res.nextCursor);
        setTotal(res.total);
      })
      .catch(() => {
        if (mine === seq.current) setError("We couldn't load tutors. Check your connection and try again.");
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
  }, [input, retryKey]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    const mine = seq.current;
    setLoadingMore(true);
    try {
      const res = await findTutors({ ...input, cursor: nextCursor });
      if (mine !== seq.current || res.error) return;
      setTutors((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...res.items.filter((t) => !seen.has(t.id))];
      });
      setNextCursor(res.nextCursor);
    } catch {
      toast.error("Couldn't load more tutors. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const filtersActive = !!subject || level !== "ALL" || onlineOnly || !!search;

  return (
    <div className="space-y-8 pb-20 p-2 lg:p-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl md:text-5xl font-black tracking-tightest">Expert Tutors.</h1>
        <p className="text-muted-foreground text-lg">Verified tutors ranked for you by subject, level, reviews, availability and price.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 bg-secondary/30 p-4 rounded-[2rem] border border-border">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search tutors by name, subject or county..."
              aria-label="Search tutors"
              className="pl-12 h-14 rounded-xl border-border bg-background focus-visible:ring-primary text-base font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {loading && !error && tutors.length > 0 && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
            )}
          </div>
          <Input
            placeholder="Subject (e.g. Chemistry)"
            aria-label="Filter by subject"
            className="h-14 sm:w-[220px] rounded-xl border-border bg-background font-bold"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Select value={level} onValueChange={(val: any) => setLevel(val ?? "ALL")}>
            <SelectTrigger className="w-full sm:w-[180px] h-14 rounded-xl border-border bg-background font-bold text-base focus:ring-primary">
              <SelectValue placeholder="Education Level" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border bg-background/95 backdrop-blur-xl">
              {LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value} className="font-bold cursor-pointer rounded-lg">
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOnlineOnly((v) => !v)}
            aria-pressed={onlineOnly}
            className={`h-9 px-4 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
              onlineOnly ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border text-muted-foreground bg-background"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${onlineOnly ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            Online now
          </button>
          {!loading && !error && (
            <span className="text-xs font-bold text-muted-foreground">
              {total} {total === 1 ? "tutor" : "tutors"}
            </span>
          )}
        </div>
      </div>

      {error ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-secondary/30 rounded-[3rem] border border-dashed border-border">
          <h3 className="text-2xl font-black tracking-tightest">Couldn&apos;t load tutors.</h3>
          <p className="text-muted-foreground max-w-sm">{error}</p>
          <Button variant="outline" onClick={() => setRetryKey((k) => k + 1)} className="rounded-full font-bold">
            Try again
          </Button>
        </div>
      ) : loading && tutors.length === 0 ? (
        <div className="py-32 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : tutors.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-secondary/30 rounded-[3rem] border border-dashed border-border">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-2">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-black tracking-tightest">
            {filtersActive ? "No tutors match those filters." : "No tutors available right now."}
          </h3>
          <p className="text-muted-foreground">Try adjusting your filters, or study with Mash AI instantly.</p>
          <Button
            onClick={() => router.push("/dashboard/study")}
            className="mt-4 h-12 px-8 rounded-full font-black text-xs tracking-widest uppercase bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
          >
            Study with Mash AI
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {tutors.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
          {nextCursor && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="rounded-xl font-bold min-w-[160px]">
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more tutors"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TutorCard({ tutor }: { tutor: any }) {
  const profile = tutor.tutorProfile;
  const rating = profile?.rating || 0;
  const reviewCount = profile?.reviewCount || 0;
  
  return (
    <Card className="border-border/50 bg-secondary/30 backdrop-blur-3xl hover:border-primary/50 transition-all duration-500 rounded-[2.5rem] overflow-hidden group shadow-xl hover:shadow-primary/5 flex flex-col h-full">
      <CardContent className="p-8 flex flex-col h-full gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <AvatarPremium seed={tutor.name} src={tutor.avatar || ""} size="lg" />
              {profile?.availability?.isOnline && (
                 <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tightest flex items-center gap-2">
                {tutor.name}
                {profile?.isVerified && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </h3>
              <div className="flex items-center gap-1 text-yellow-500 mt-1">
                <Star className="h-3 w-3 fill-current" />
                <span className="text-xs font-bold">{rating > 0 && reviewCount > 0 ? `${rating.toFixed(1)} (${reviewCount})` : "New"}</span>
                {profile?.totalSessions > 0 && (
                  <span className="text-xs font-bold text-muted-foreground ml-1">· {profile.totalSessions} sessions</span>
                )}
              </div>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
            {profile?.hourlyRate ? `KSH ${profile.hourlyRate}/hr` : "Rate on request"}
          </Badge>
        </div>

        {tutor.match?.reasons?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 -mt-2">
            {tutor.match.reasons.slice(0, 3).map((r: string) => (
              <span key={r} className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 rounded-full px-2 py-0.5">
                {r}
              </span>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
          {profile?.bio || "No bio provided."}
        </p>

        <div className="flex flex-wrap gap-2">
          {profile?.subjects?.slice(0, 3).map((sub: string) => (
            <Badge key={sub} variant="outline" className="border-border bg-background text-[10px] font-black uppercase tracking-widest rounded-full">
              {sub}
            </Badge>
          ))}
          {profile?.subjects?.length > 3 && (
            <Badge variant="outline" className="border-border bg-background text-[10px] font-black uppercase tracking-widest rounded-full">
              +{profile.subjects.length - 3}
            </Badge>
          )}
        </div>

        <div className="pt-4 border-t border-border/50 mt-auto">
          <BookingDialog tutor={tutor} />
        </div>
      </CardContent>
    </Card>
  );
}

function BookingDialog({ tutor }: { tutor: any }) {
  const [open, setOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [subject, setSubject] = useState(tutor.tutorProfile?.subjects?.[0] || "");
  const [topic, setTopic] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const router = useRouter();

  // Generate real time slots from tutorAvailabilities
  const timeSlots: { label: string, value: string, date: string, startTime: string }[] = [];
  
  if (tutor.tutorAvailabilities && tutor.tutorAvailabilities.length > 0) {
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay(); // 0 is Sunday
      
      const slotsForDay = tutor.tutorAvailabilities.filter((a: any) => a.dayOfWeek === dayOfWeek && !a.isBlocked);
      slotsForDay.forEach((slot: any) => {
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        // createBooking only accepts a local YYYY-MM-DD date. This used to send
        // d.toISOString() (a UTC timestamp), so every booking was rejected as
        // "Invalid date or time".
        const dateStr = dateKey;
        if (slotOverlapsBlock(dateKey, slot.startTime, 60, tutor.tutorAvailabilityBlocks)) return;
        const value = `${dateStr}|${slot.startTime}`;
        const label = `${d.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}, ${slot.startTime} - ${slot.endTime}`;
        timeSlots.push({ label, value, date: dateStr, startTime: slot.startTime });
      });
    }
  }

  const handleBook = async () => {
    if (!subject || !topic || !selectedSlot) {
      toast.error("Please fill all fields.");
      return;
    }
    
    const [date, startTime] = selectedSlot.split("|");
    
    setBooking(true);
    try {
      const res = await createBooking(tutor.id, subject, topic, date, startTime, 60);
      if (res.success) {
        toast.success("Session Request Sent!", {
          description: "The tutor will review and confirm your request."
        });
        setOpen(false);
        // Maybe redirect or just close
      } else {
        toast.error(res.error || "Failed to book session.");
      }
    } catch (e) {
      toast.error("An error occurred.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="w-full h-12 rounded-xl font-black text-xs tracking-widest uppercase bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95">
          <Calendar className="mr-2 h-4 w-4" /> Book Session
        </Button>
      } />
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card border-border rounded-[2rem]">
        <DialogHeader className="p-8 pb-0">
          <DialogTitle className="text-3xl font-black tracking-tightest">Book {tutor.name}</DialogTitle>
          <p className="text-muted-foreground mt-2">Schedule a personalized learning session.</p>
        </DialogHeader>

        <div className="p-8 space-y-8">
          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Subject</label>
             <Select value={subject} onValueChange={(v) => setSubject(v ?? "")}>
               <SelectTrigger className="h-14 rounded-xl border-border bg-background font-bold focus:ring-primary">
                 <SelectValue placeholder="Choose subject" />
               </SelectTrigger>
               <SelectContent className="rounded-xl border-border bg-background/95 backdrop-blur-xl">
                 {tutor.tutorProfile?.subjects?.map((sub: string) => (
                   <SelectItem key={sub} value={sub} className="font-bold cursor-pointer rounded-lg">{sub}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Time Slot</label>
             {timeSlots.length === 0 ? (
               <div className="p-4 bg-secondary/30 border border-border rounded-xl text-center">
                 <p className="text-sm font-bold text-muted-foreground">Tutor has no available slots.</p>
               </div>
             ) : (
               <Select value={selectedSlot} onValueChange={(v) => setSelectedSlot(v ?? "")}>
                 <SelectTrigger className="h-14 rounded-xl border-border bg-background font-bold focus:ring-primary">
                   <SelectValue placeholder="Choose a time slot" />
                 </SelectTrigger>
                 <SelectContent className="rounded-xl border-border bg-background/95 backdrop-blur-xl max-h-[200px]">
                   {timeSlots.map((slot) => (
                     <SelectItem key={slot.value} value={slot.value} className="font-bold cursor-pointer rounded-lg">
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
             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">What do you need help with?</label>
             <Textarea 
                placeholder="List any specific topics, weak areas, or upcoming assignments..."
                className="min-h-[120px] rounded-xl border-border bg-background font-medium focus-visible:ring-primary p-4 resize-none"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
             />
          </div>

          <Button 
            onClick={handleBook} 
            disabled={booking || !subject || !topic || !selectedSlot}
            className="w-full h-14 rounded-xl font-black text-sm tracking-widest uppercase bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            {booking ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm Booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
