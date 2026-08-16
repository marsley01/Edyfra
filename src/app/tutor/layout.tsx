import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { TutorSidebar } from "@/components/dashboard/TutorSidebar";
import { TutorMobileNav } from "@/components/dashboard/TutorMobileNav";
import { ThemeToggle } from "@/components/theme-toggle";
import { TutorVideoShell } from "./TutorVideoShell";
import TourGuide from "@/components/tour/TourGuide";
import TourTrigger from "@/components/tour/TourTrigger";
import prisma from "@/lib/prisma";
import { AgentWidget } from "@/components/ai/AgentWidget";

const TUTOR_DASHBOARD_STEPS = [
  {
    target: "tour-greeting",
    title: "Welcome, Tutor",
    description: "This is your tutor dashboard. You can see your schedule, earnings, and student requests here.",
    placement: "bottom" as const,
  },
  {
    target: "tour-status-toggle",
    title: "Go online",
    description: "Toggle this switch to let students know you are available for sessions. When offline, you won't receive new match requests.",
    placement: "bottom" as const,
  },
  {
    target: "tour-match-requests",
    title: "Student requests",
    description: "See real-time requests from students who need help with your subjects. Accept and join a room instantly.",
    placement: "top" as const,
  },
  {
    target: "tour-stats",
    title: "Your stats",
    description: "Track your active sessions, completed sessions, response rate, and rating all at a glance.",
    placement: "bottom" as const,
  },
  {
    target: "tour-schedule",
    title: "Your schedule",
    description: "View upcoming booked sessions with students. You can join rooms directly from here when it's time.",
    placement: "top" as const,
  },
  {
    target: "tour-availability",
    title: "Manage availability",
    description: "Set your bookable time slots so students know when you are free. Update this whenever your schedule changes.",
    placement: "left" as const,
  },
  {
    target: "tour-sidebar",
    title: "Navigation hub",
    description: "Access all tutor features from here — schedule, requests, sessions, community, and settings.",
    placement: "right" as const,
  },
];

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use Prisma as the source of truth for role — user_metadata can lag behind
  // after a role change (JWT is only refreshed on next sign-in).
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  const role = dbUser?.role?.toUpperCase() || (user.user_metadata?.role || "").toUpperCase();
  if (role !== "TUTOR" && role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <TutorVideoShell>
      <div className="flex flex-col lg:flex-row min-h-screen bg-background">
        <TutorMobileNav user={user} />

        {/* Desktop sidebar */}
        <TutorSidebar user={user} />

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-32">
          {/* Desktop top bar */}
          <header className="hidden lg:flex h-16 bg-background/80 backdrop-blur-xl border-b border-border px-8 items-center sticky top-0 z-30">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mr-auto">
              Tutor Dashboard
            </span>
            <ThemeToggle />
          </header>

          <div className="p-2 lg:p-6 max-w-6xl mx-auto w-full">{children}</div>
        </main>

        <TourGuide tourId="tutor-dashboard" steps={TUTOR_DASHBOARD_STEPS} />
        <TourTrigger tourId="tutor-dashboard" />
        <AgentWidget agentId="mash" />
      </div>
    </TutorVideoShell>
  );
}
