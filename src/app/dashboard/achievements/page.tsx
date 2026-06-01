"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Trophy, Star, Zap, 
  Flame, GraduationCap, Loader2,
  Award, ShieldCheck, Target
} from "lucide-react";
import { getAchievements, checkAndAwardAchievements } from "@/app/actions/achievements";
import { toast } from "sonner";

import { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Zap: Zap,
  GraduationCap: GraduationCap,
  Flame: Flame,
  Trophy: Trophy,
  Star: Star,
  Award: Award,
  ShieldCheck: ShieldCheck,
  Target: Target
};

export default function AchievementsPage() {
  type Achievement = { id: string; userId: string; type: string; icon: string; title: string; description: string; unlockedAt: Date | string };
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      await checkAndAwardAchievements();
      const data = await getAchievements();
      setAchievements(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load honors");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/5">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-primary uppercase">Your Achievements</h1>
        <p className="text-muted-foreground text-lg font-medium italic">Every badge tells a story of something you've accomplished.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
        {achievements.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-primary/5 rounded-[3rem] border-2 border-dashed border-primary/10">
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No achievements yet. Start studying and you'll unlock your first one soon!</p>
          </div>
        ) : (
          achievements.map((ach) => {
            const Icon = ICON_MAP[ach.icon] || Award;
            return (
              <Card key={ach.id} className="border-none shadow-lg rounded-[3rem] overflow-hidden group hover:scale-[1.02] transition-all duration-500 bg-white dark:bg-slate-900">
                <CardContent className="p-10 flex flex-col items-center text-center space-y-6">
                  <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white shadow-2xl shadow-primary/30 group-hover:rotate-12 transition-transform duration-500">
                    <Icon className="h-12 w-12" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight text-primary">{ach.title}</h3>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed px-4">{ach.description}</p>
                  </div>
                  <div className="pt-4 border-t border-primary/5 w-full">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                      Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
