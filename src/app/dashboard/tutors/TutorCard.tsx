"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2 } from "lucide-react";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import type { TutorWithProfile } from "./types";
import { BookingDialog } from "./BookingDialog";

interface TutorCardProps {
  tutor: TutorWithProfile;
}

export function TutorCard({ tutor }: TutorCardProps) {
  const profile = tutor.tutorProfile;
  const isOnline =
    (profile?.availability as { isOnline?: boolean } | null)?.isOnline === true;
  const rating = profile?.rating ?? 0;
  const totalSessions = profile?.totalSessions ?? 0;
  const subjects = profile?.subjects ?? [];
  const visibleSubjects = subjects.slice(0, 3);
  const remainingSubjects = Math.max(subjects.length - visibleSubjects.length, 0);

  return (
    <Card className="border-border/50 bg-secondary/30 backdrop-blur-3xl hover:border-primary/50 transition-all duration-500 rounded-[2.5rem] overflow-hidden group shadow-xl hover:shadow-primary/5 flex flex-col h-full">
      <CardContent className="p-8 flex flex-col h-full gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <AvatarPremium seed={tutor.name} src={tutor.avatar ?? ""} size="lg" />
              {isOnline && (
                <span
                  className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  aria-label="Online"
                />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tightest flex items-center gap-2">
                {tutor.name}
                {profile?.isVerified && (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
              </h3>
              <div className="flex items-center gap-1 text-yellow-500 mt-1">
                <Star className="h-3 w-3 fill-current" />
                <span className="text-xs font-bold">
                  {rating > 0 ? rating.toFixed(1) : "New"}
                </span>
              </div>
            </div>
          </div>
          {totalSessions > 0 && (
            <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
              {totalSessions} Sessions
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
          {profile?.bio || "No bio provided."}
        </p>

        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {visibleSubjects.map((sub) => (
              <Badge
                key={sub}
                variant="outline"
                className="border-border bg-background text-[10px] font-black uppercase tracking-widest rounded-full"
              >
                {sub}
              </Badge>
            ))}
            {remainingSubjects > 0 && (
              <Badge
                variant="outline"
                className="border-border bg-background text-[10px] font-black uppercase tracking-widest rounded-full"
              >
                +{remainingSubjects}
              </Badge>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-border/50 mt-auto">
          <BookingDialog tutor={tutor} />
        </div>
      </CardContent>
    </Card>
  );
}
