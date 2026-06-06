"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LottieAnimation } from "@/components/lottie-animation";
import { EduLevel } from "@/generated/client";
import { useDebounced } from "@/hooks/use-debounced";
import { TutorCard } from "./TutorCard";
import type { TutorWithProfile } from "./types";

interface TutorsClientProps {
  initialTutors: TutorWithProfile[];
  initialLevel: EduLevel | "ALL";
}

const LEVEL_OPTIONS: { value: EduLevel | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Levels" },
  { value: EduLevel.HIGH_SCHOOL, label: "High School" },
  { value: EduLevel.UNIVERSITY, label: "University" },
];

function matchesSearch(tutor: TutorWithProfile, q: string): boolean {
  if (!q) return true;
  const haystack = [
    tutor.name,
    tutor.bio ?? "",
    tutor.county ?? "",
    ...(tutor.tutorProfile?.subjects ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export default function TutorsClient({
  initialTutors,
  initialLevel,
}: TutorsClientProps) {
  const [tutors] = useState<TutorWithProfile[]>(initialTutors);
  const [level, setLevel] = useState<EduLevel | "ALL">(initialLevel);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 250);
  const router = useRouter();

  const filteredTutors = useMemo(
    () => tutors.filter((t) => matchesSearch(t, debouncedSearch.toLowerCase().trim())),
    [tutors, debouncedSearch],
  );

  const handleLevelChange = (next: EduLevel | "ALL") => {
    setLevel(next);
    const url = next === "ALL" ? "/dashboard/tutors" : `/dashboard/tutors?level=${next}`;
    router.replace(url, { scroll: false });
  };

  const clearFilters = () => {
    setSearch("");
    setLevel("ALL");
    router.replace("/dashboard/tutors", { scroll: false });
  };

  const hasFilters = search !== "" || level !== "ALL";

  return (
    <div className="space-y-8 pb-32 p-2 lg:p-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl md:text-5xl font-black tracking-tightest flex items-center gap-3">
          Expert Tutors.
          <Sparkles className="h-7 w-7 text-primary" />
        </h1>
        <p className="text-muted-foreground text-lg">
          Book personalized sessions with verified educators to master any subject.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-secondary/30 p-4 rounded-[2rem] border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search tutors, subjects, or bio..."
            className="pl-12 h-14 rounded-xl border-border bg-background focus-visible:ring-primary text-base font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tutors"
          />
        </div>
        <Select
          value={level}
          onValueChange={(v) => handleLevelChange(v as EduLevel | "ALL")}
        >
          <SelectTrigger className="w-full sm:w-[200px] h-14 rounded-xl border-border bg-background font-bold text-base focus:ring-primary">
            <SelectValue placeholder="Education Level" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border bg-background/95 backdrop-blur-xl">
            {LEVEL_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="font-bold cursor-pointer rounded-lg"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredTutors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-12 flex flex-col items-center justify-center text-center space-y-6 bg-secondary/30 rounded-[3rem] border border-dashed border-border"
        >
          <div className="w-48 h-48">
            <LottieAnimation
              url="/animations/no-messages.json"
              loop
              autoplay={false}
            />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-2xl md:text-3xl font-black tracking-tightest">
              {hasFilters ? "No matches just yet" : "No tutors online right now"}
            </h3>
            <p className="text-muted-foreground font-medium">
              {hasFilters
                ? "Try clearing the filters, or jump into a study session and we'll match you instantly."
                : "Tutors take breaks too. In the meantime, Mash AI is always ready to help you learn."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => router.push("/dashboard/study")}
              className="h-12 px-8 rounded-full font-black text-xs tracking-widest uppercase bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 transition-all active:scale-95 gap-2"
            >
              <Zap className="h-4 w-4 fill-current" /> Find me someone now
            </Button>
            {hasFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="h-12 px-6 rounded-full font-bold text-xs uppercase tracking-widest"
              >
                Clear filters
              </Button>
            )}
          </div>
        </motion.div>
      ) : (
        <>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {filteredTutors.length} tutor{filteredTutors.length === 1 ? "" : "s"} found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTutors.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
