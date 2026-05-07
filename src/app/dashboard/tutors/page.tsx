"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GraduationCap, Search, Clock, Loader2, Sparkles, Users as UsersIcon } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSubjectsByLevel } from "@/utils/subjects";
import { getUserData } from "@/app/actions/user";
import { getVerifiedTutors } from "@/app/actions/tutor";
import { toggleFollow } from "@/app/actions/social";
import { User, TutorProfile } from "@prisma/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type TutorWithProfile = User & { tutorProfile: TutorProfile | null };

export default function TutorsPage() {
  const [tutors, setTutors] = useState<TutorWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const initialLoadRef = useRef(true); // Ref to track initial load
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitX, setExitX] = useState(0);

  const fetchTutors = useCallback(async (currentUser: User | null) => {
    setLoading(true);
    setIsUnauthorized(false);
    try {
      if (!currentUser) {
        setIsUnauthorized(true);
        setTutors([]);
        return;
      }
      // Fix for Type Error: Coalesce Prisma 'null' to 'undefined' for the server action
      const data = await getVerifiedTutors(currentUser.educationLevel ?? undefined);
      setTutors(data);
    } catch (err) {
      console.error("Error fetching tutors:", err);
      setIsUnauthorized(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const performSearch = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    try {
      const { searchTutors } = await import("@/app/actions/tutor");
      const data = await searchTutors(search);
      // Filter or update based on search
      setTutors(data as TutorWithProfile[]);
    } catch (err) {
      console.error("Search failed:", err);
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, userData]);

  useEffect(() => {
    const loadUserDataAndTutors = async () => {
      const user = await getUserData();
      setUserData(user);
      if (initialLoadRef.current) {
        await fetchTutors(user);
        initialLoadRef.current = false;
      }
    };
    loadUserDataAndTutors();
  }, [fetchTutors]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (search.length >= 2) {
        performSearch();
      } else if (search.length === 0 && !initialLoadRef.current) {
        fetchTutors(userData);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search, performSearch, fetchTutors, userData]);

  const handleSwipe = async (direction: "left" | "right") => {
    setExitX(direction === "right" ? 500 : -500);

    if (direction === "right") {
      const tutor = tutors[currentIndex];
      try {
        await toggleFollow(tutor.id);
        toast.success(`Liked ${tutor.name}!`, {
          description: "Connection request sent successfully.",
          icon: "✨"
        });
      } catch (err) {
        toast.error("Failed to connect.");
      }
    }

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setExitX(0);
    }, 50);
  };

  const createTestMentor = async () => {
    try {
      const { createTestTutorAction } = await import("@/app/actions/user");
      await createTestTutorAction();
      toast.success("Authentic Mentor Created!");
      await fetchTutors(userData);
    } catch (err) {
      toast.error("Operation failed.");
    }
  };

  const subjects = getSubjectsByLevel(userData?.educationLevel || "HIGH_SCHOOL");

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-border/50">
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Find a Mentor</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tightest leading-none">
            Get <br /> <span className="text-muted-foreground">Connected.</span>
          </h1>
        </div>
        <div className="flex flex-col sm:row gap-4 w-full md:w-auto">
          <div className="relative group flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              className="h-14 pl-12 rounded-2xl border-border bg-secondary shadow-sm focus-visible:ring-primary"
              placeholder="Search experts by name or school..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
          </div>
          <Select value={subject} onValueChange={(v) => setSubject(v || "all")}>
            <SelectTrigger className="h-14 w-full sm:w-[220px] rounded-2xl border-border bg-secondary font-bold">
              <SelectValue placeholder="All Disciplines" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border bg-background shadow-2xl">
              <SelectItem value="all" className="font-bold">All Disciplines</SelectItem>
              {subjects.map(s => (
                <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && tutors.length === 0 ? (
        <div className="flex items-center justify-center h-[500px]">
          <div className="h-[400px] w-[350px] bg-secondary animate-pulse rounded-[3rem] border border-border/50" />
        </div>
      ) : isUnauthorized ? (
        <div className="flex flex-col items-center justify-center py-48 space-y-8 bg-secondary/30 rounded-[3rem] border-2 border-dashed border-border">
          <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center text-muted-foreground shadow-sm">
            <UsersIcon className="h-10 w-10 text-red-500 opacity-50" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black tracking-tight">Access Denied.</h3>
            <p className="text-muted-foreground font-medium max-w-sm mx-auto">
              You are not authorized to view this content. Please log in or ensure your account has the necessary permissions.
            </p>
          </div>
          <Link href="/login">
            <Button className="h-14 px-10 rounded-2xl bg-foreground text-background font-black text-[10px] tracking-widest uppercase shadow-xl transition-all active:scale-95">
              Log In
            </Button>
          </Link>
        </div>
      ) : tutors.length > 0 && currentIndex < tutors.length ? (
        <div className="relative h-[600px] w-full flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={tutors[currentIndex].id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 100) handleSwipe("right");
                else if (info.offset.x < -100) handleSwipe("left");
              }}
              initial={{ scale: 0.9, opacity: 0, rotate: -5 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{
                x: exitX,
                opacity: 0,
                rotate: exitX > 0 ? 45 : -45
              }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
                 className="absolute w-[320px] sm:w-[350px] md:w-[450px] h-[520px] sm:h-[550px] bg-secondary rounded-[2rem] sm:rounded-[3rem] border border-border/50 shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing flex flex-col"
            >
              <div className="relative h-2/3 bg-primary/5 flex items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-secondary/80" />
                <AvatarPremium
                  seed={tutors[currentIndex].id}
                  src={tutors[currentIndex].avatar || ""}
                  size="xl"
                  className="scale-[2.5] relative z-10"
                />
                <div className="absolute top-8 left-8 z-20 flex flex-col gap-2">
                  <div className="px-4 py-2 rounded-2xl bg-background/50 backdrop-blur-md border border-border/50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">⭐ {tutors[currentIndex].tutorProfile?.rating?.toFixed(1) || "5.0"}</span>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-primary text-white shadow-lg">
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {tutors[currentIndex].educationLevel === 'UNIVERSITY' ? 'University Expert' : 'High School Expert'}
                    </span>
                  </div>
                </div>

              </div>

              <div className="flex-1 p-10 space-y-6 bg-secondary">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight">{tutors[currentIndex].name}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="h-3 w-3" /> {tutors[currentIndex].county}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tutors[currentIndex].tutorProfile?.subjects?.map(s => (
                    <span key={s} className="px-3 py-1 rounded-full bg-background border border-border text-[8px] font-black uppercase tracking-widest">
                      {s}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground font-medium leading-relaxed line-clamp-2">
                  {tutors[currentIndex].tutorProfile?.bio}
                </p>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Rate</span>
                    <span className="text-xl font-black">KSH {tutors[currentIndex].tutorProfile?.hourlyRate}</span>
                  </div>
                   <div className="flex gap-3">
                      <Button onClick={() => handleSwipe("left")} variant="outline" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-border hover:bg-red-500/10 hover:text-red-500 transition-all">
                        <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                      <Button onClick={() => handleSwipe("right")} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-white shadow-xl shadow-primary/20 hover:scale-110 active:scale-95 transition-all">
                        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                    </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-4 text-[9px] font-black uppercase tracking-[0.5em] text-muted-foreground animate-pulse">
            Swipe Right to Connect • Swipe Left to Skip
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-48 space-y-8 bg-secondary/30 rounded-[3rem] border-2 border-dashed border-border">
          <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center text-muted-foreground shadow-sm">
            <Sparkles className="h-10 w-10 text-primary opacity-20" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black tracking-tight">Search Finished.</h3>
            <p className="text-muted-foreground font-medium max-w-sm mx-auto">
              We&apos;ve looked everywhere and couldn&apos;t find any new tutors matching your current needs.
              New teachers are joining our community every hour—check back soon.
            </p>
          </div>
             <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => { setSearch(""); setSubject("all"); setCurrentIndex(0); fetchTutors(userData); }} variant="outline" className="h-12 sm:h-14 px-6 sm:px-10 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs tracking-widest uppercase border-border hover:bg-secondary transition-all">
                Refresh List
              </Button>
              <Link href="/dashboard">
                <Button className="h-12 sm:h-14 px-6 sm:px-10 rounded-xl sm:rounded-2xl bg-foreground text-background font-black text-[10px] sm:text-xs tracking-widest uppercase shadow-xl transition-all active:scale-95">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
        </div>
      )}
    </div>
  );
}
