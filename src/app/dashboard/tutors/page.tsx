"use client";

import { useState, useEffect } from "react";
import { getVerifiedTutors, bookTutorSession } from "@/app/actions/tutor";
import { EduLevel } from "@/generated/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star, CheckCircle2, Clock, Calendar, Search } from "lucide-react";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

export default function TutorsPage() {
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<EduLevel | "ALL">("ALL");

  useEffect(() => {
    loadTutors();
  }, [level]);

  const loadTutors = async () => {
    setLoading(true);
    const data = await getVerifiedTutors(level === "ALL" ? undefined : level);
    setTutors(data || []);
    setLoading(false);
  };

  const filteredTutors = tutors.filter((t: any) => 
    t.name?.toLowerCase().includes(search.toLowerCase()) || 
    t.tutorProfile?.subjects?.some((s: string) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-20 p-2 lg:p-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl md:text-5xl font-black tracking-tightest">Expert Tutors.</h1>
        <p className="text-muted-foreground text-lg">Book personalized sessions with verified educators to master any subject.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-secondary/30 p-4 rounded-[2rem] border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search tutors or subjects..." 
            className="pl-12 h-14 rounded-xl border-border bg-background focus-visible:ring-primary text-base font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={level} onValueChange={(val: any) => setLevel(val)}>
          <SelectTrigger className="w-full sm:w-[200px] h-14 rounded-xl border-border bg-background font-bold text-base focus:ring-primary">
            <SelectValue placeholder="Education Level" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border bg-background/95 backdrop-blur-xl">
            <SelectItem value="ALL" className="font-bold cursor-pointer rounded-lg">All Levels</SelectItem>
            <SelectItem value="HIGH_SCHOOL" className="font-bold cursor-pointer rounded-lg">High School</SelectItem>
            <SelectItem value="UNIVERSITY" className="font-bold cursor-pointer rounded-lg">University</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-32 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : filteredTutors.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-secondary/30 rounded-[3rem] border border-dashed border-border">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-2">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-black tracking-tightest">No tutors found.</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTutors.map((tutor) => (
            <TutorCard key={tutor.id} tutor={tutor} />
          ))}
        </div>
      )}
    </div>
  );
}

function TutorCard({ tutor }: { tutor: any }) {
  const profile = tutor.tutorProfile;
  const rating = profile?.rating || 0;
  
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
                <span className="text-xs font-bold">{rating > 0 ? rating.toFixed(1) : "New"}</span>
              </div>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
            KSH {profile?.hourlyRate}/hr
          </Badge>
        </div>

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
  const [time, setTime] = useState("");
  const router = useRouter();

  // Mock time slots (these would normally come from tutor.availability)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  
  const timeSlots = [
    { label: `Tomorrow, 2:00 PM`, value: new Date(tomorrow.setHours(14, 0, 0, 0)).toISOString() },
    { label: `Tomorrow, 4:00 PM`, value: new Date(tomorrow.setHours(16, 0, 0, 0)).toISOString() },
    { label: `${dayAfter.toLocaleDateString('en-US', {weekday: 'short'})}, 10:00 AM`, value: new Date(dayAfter.setHours(10, 0, 0, 0)).toISOString() },
    { label: `${dayAfter.toLocaleDateString('en-US', {weekday: 'short'})}, 3:00 PM`, value: new Date(dayAfter.setHours(15, 0, 0, 0)).toISOString() },
  ];

  const handleBook = async () => {
    if (!subject || !topic || !time) {
      toast.error("Please fill all fields.");
      return;
    }
    setBooking(true);
    try {
      const res = await bookTutorSession(tutor.id, subject, topic, time);
      if (res.success) {
        toast.success("Session Booked!", {
          description: "You can find it in your sessions tab."
        });
        setOpen(false);
        router.push("/dashboard/sessions");
      } else {
        toast.error("Failed to book session.");
      }
    } catch (e) {
      toast.error("An error occurred.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button className="w-full h-12 rounded-xl font-black text-xs tracking-widest uppercase bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95">
          <Calendar className="mr-2 h-4 w-4" /> Book Session
        </Button>
      </DialogTrigger>
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
             <Select value={time} onValueChange={(v) => setTime(v ?? "")}>
               <SelectTrigger className="h-14 rounded-xl border-border bg-background font-bold focus:ring-primary">
                 <SelectValue placeholder="Choose a time slot" />
               </SelectTrigger>
               <SelectContent className="rounded-xl border-border bg-background/95 backdrop-blur-xl">
                 {timeSlots.map((slot) => (
                   <SelectItem key={slot.value} value={slot.value} className="font-bold cursor-pointer rounded-lg">
                     <div className="flex items-center gap-2">
                       <Clock className="h-4 w-4 text-primary" /> {slot.label}
                     </div>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
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
            disabled={booking || !subject || !topic || !time}
            className="w-full h-14 rounded-xl font-black text-sm tracking-widest uppercase bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            {booking ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm Booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
