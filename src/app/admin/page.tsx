import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "./dashboard-client";
import { getAdminDashboardMetrics, getTutorApplications } from "@/app/actions/admin";
import { getAdminAnalytics } from "@/app/actions/analytics";
import prisma from "@/lib/prisma";
import { isFounderEmail } from "@/utils/admin-guard";
import { Role } from "@/generated/client";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard");
  }

  const isFounder = isFounderEmail(user.email);
  const prismaUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  const isDbAdmin = prismaUser?.role === Role.ADMIN;

  if (!isFounder && !isDbAdmin) {
    redirect("/dashboard");
  }

  const metrics = await getAdminDashboardMetrics();
  const pendingApplications = await getTutorApplications();
  const analytics = await getAdminAnalytics();

  // Additional tutor metrics
  const tutorMetrics = await prisma.tutorProfile.aggregate({
    _avg: { responseRate: true, rating: true },
    _sum: { sessionsAssigned: true, sessionsResponded: true },
    _count: true,
  });

  const allTutorsForIdle = await prisma.user.findMany({
    where: {
      role: Role.TUTOR,
      tutorProfile: {
        currentActiveSessions: 0,
        totalAssignmentsToday: 0,
      },
    },
    include: { tutorProfile: true },
  });
  const idleTutors = allTutorsForIdle.filter(t => {
    const availability = t.tutorProfile?.availability as any;
    return availability?.isOnline === true;
  }).length;

  // Session metrics
  const sessionMetrics = await prisma.session.groupBy({
    by: ["subject"],
    _count: true,
    where: { status: "COMPLETED" },
    orderBy: { _count: { subject: "desc" } },
    take: 5,
  });

  const peakHours = await prisma.session.findMany({
    select: { startedAt: true },
    where: { status: "COMPLETED", startedAt: { not: null } },
  });

  const hourCounts: Record<number, number> = {};
  peakHours.forEach(s => {
    if (s.startedAt) {
      const hour = s.startedAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });
  const peakHoursArray = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Booking metrics
  const bookingMetrics = await Promise.all([
    prisma.booking.count({ where: { status: "confirmed" } }),
    prisma.booking.count({ where: { status: "declined" } }),
    prisma.booking.count({ where: { status: "student_no_show" } }),
    prisma.booking.count({ where: { status: "tutor_no_show" } }),
    prisma.booking.count({ where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);

  // Recent signups for source tracking
  const recentSignups = await prisma.analyticsEvent.findMany({
    where: { eventType: "signup", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    take: 200,
    orderBy: { createdAt: "desc" },
  });
  const referralSignups = recentSignups.filter(e => {
    const meta = e.metadata as any;
    return meta?.referred === true;
  }).length;
  const directSignups = recentSignups.length - referralSignups;

  return (
    <AdminDashboardClient
      stats={metrics.mainStats}
      telemetry={metrics.telemetry}
      pendingApplications={pendingApplications}
      recentUsers={metrics.recentUsers}
      systemLoad={metrics.systemLoad}
      completedSessions={metrics.completedSessions}
      analytics={analytics}
      tutorMetrics={{
        avgResponseRate: tutorMetrics._avg.responseRate || 0,
        avgRating: tutorMetrics._avg.rating || 0,
        totalAssigned: tutorMetrics._sum.sessionsAssigned || 0,
        totalResponded: tutorMetrics._sum.sessionsResponded || 0,
        idleTutors,
      }}
      sessionMetrics={{
        topSubjects: sessionMetrics.map(s => ({ subject: s.subject, count: s._count })),
        peakHours: peakHoursArray,
        totalCompleted: metrics.completedSessions,
      }}
      bookingMetrics={{
        confirmed: bookingMetrics[0],
        declined: bookingMetrics[1],
        studentNoShow: bookingMetrics[2],
        tutorNoShow: bookingMetrics[3],
        today: bookingMetrics[4],
      }}
      acquisitionMetrics={{
        direct: directSignups,
        referral: referralSignups,
        total: recentSignups.length,
        signupsToday: analytics.signupsToday,
        signupsThisWeek: analytics.signupsThisWeek,
        signupsThisMonth: analytics.signupsThisMonth,
      }}
    />
  );
}
