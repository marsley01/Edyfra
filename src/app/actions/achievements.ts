"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAchievements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: achievements } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false });

  return (achievements || []).map(a => ({
    ...a,
    userId: a.user_id,
    unlockedAt: a.unlocked_at,
  }));
}

export async function checkAndAwardAchievements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const [
    { count: studentSessions },
    { count: tutorSessions },
    { count: challengeAttempts },
  ] = await Promise.all([
    supabase.from("sessions").select("*", { count: "exact", head: true }).eq("student_id", user.id),
    supabase.from("sessions").select("*", { count: "exact", head: true }).eq("partner_id", user.id),
    supabase.from("daily_challenge_attempts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const sessionCount = (studentSessions || 0) + (tutorSessions || 0);
  const challengeCount = challengeAttempts || 0;

  const possibleAchievements = [
    {
      type: "FIRST_MATCH",
      title: "First Step to Success",
      description: "Completed your first study session.",
      icon: "Zap",
      check: () => sessionCount >= 1
    },
    {
      type: "SESSIONS_5",
      title: "Dedicated Scholar",
      description: "Completed 5 study sessions.",
      icon: "GraduationCap",
      check: () => sessionCount >= 5
    },
    {
      type: "FIRST_CHALLENGE",
      title: "Daily Warrior",
      description: "Completed your first daily quest.",
      icon: "Flame",
      check: () => challengeCount >= 1
    }
  ];

  for (const ach of possibleAchievements) {
    if (ach.check()) {
      await supabase
        .from("achievements")
        .upsert({
          user_id: user.id,
          type: ach.type,
          title: ach.title,
          description: ach.description,
          icon: ach.icon,
        }, { onConflict: "user_id,type" });
    }
  }

  revalidatePath("/dashboard/achievements");
}
