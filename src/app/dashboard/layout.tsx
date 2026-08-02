import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import DashboardSidebar from "@/components/dashboard/Sidebar";
import MatchNotification from "@/components/dashboard/MatchNotification";
import MobileNav from "@/components/dashboard/MobileNav";
import DashboardProviders from "./DashboardProviders";
import TourGuide from "@/components/tour/TourGuide";
import TourTrigger from "@/components/tour/TourTrigger";

const STUDENT_DASHBOARD_STEPS = [
  {
    target: "tour-greeting",
    title: "Welcome to your dashboard",
    description: "This is your personal command center. Here you can see your progress, upcoming sessions, and daily challenges all in one place.",
    placement: "bottom" as const,
  },
  {
    target: "tour-start-session",
    title: "Start a session",
    description: "Jump straight into a study session. You can match with a tutor or start an instant peer study room.",
    placement: "bottom" as const,
  },
  {
    target: "tour-activity",
    title: "Your activity",
    description: "Track your recent sessions, upcoming bookings, and learning history. Everything you need to stay on top of your studies.",
    placement: "top" as const,
  },
  {
    target: "tour-daily-challenge",
    title: "Daily challenge",
    description: "Complete your daily quiz to earn XP and keep your streak alive. Questions adapt to your education level.",
    placement: "left" as const,
  },
  {
    target: "tour-referral",
    title: "Refer friends",
    description: "Share your referral code with friends. You both earn XP when they complete their first session.",
    placement: "top" as const,
  },
  {
    target: "tour-find-tutor",
    title: "Find a mentor",
    description: "Stuck on a topic? Browse tutors by subject, rating, and availability to find the perfect match for you.",
    placement: "top" as const,
  },
  {
    target: "tour-sidebar",
    title: "Navigation hub",
    description: "Access all features from here — study, community, challenges, resources, and settings. Everything is one tap away.",
    placement: "right" as const,
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { institutionMembers: true, studentProfile: true, tutorProfile: true },
  });

  const hasOnboarded = dbUser?.studentProfile || dbUser?.tutorProfile || dbUser?.role === "ADMIN" || dbUser?.role === "FOUNDER";
  if (!hasOnboarded) {
    redirect("/onboarding/choice");
  }

  const isInstitutionStaff = dbUser?.institutionMembers?.some(
    (m) =>
      ["INSTITUTION_ADMIN", "INSTITUTION_DEPUTY", "INSTITUTION_TEACHER"].includes(m.role) &&
      m.status === "ACTIVE"
  );

  if (isInstitutionStaff && dbUser?.role === "STUDENT") {
    redirect("/institution/dashboard");
  }

  return (
    <DashboardProviders>
      <div className="flex flex-col lg:flex-row min-h-screen bg-background">
        <MobileNav user={user} />
        <DashboardSidebar user={user} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
        <MatchNotification />
        <TourGuide tourId="student-dashboard" steps={STUDENT_DASHBOARD_STEPS} />
        <TourTrigger tourId="student-dashboard" />
      </div>
    </DashboardProviders>
  );
}
