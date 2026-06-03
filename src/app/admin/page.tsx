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
  let prismaUser: { role: string } | null = null;
  try {
    prismaUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
  } catch (err) {
    console.error("[Admin] Failed to fetch user role:", err);
  }

  const isDbAdmin = prismaUser?.role === Role.ADMIN;

  if (!isFounder && !isDbAdmin) {
    redirect("/dashboard");
  }

  // Fetch all data in parallel with individual error boundaries
  // This prevents a single failing query from crashing the entire page
  const [metrics, pendingApplications, analytics] = await Promise.all([
    getAdminDashboardMetrics(),
    getTutorApplications(),
    getAdminAnalytics(),
  ]);

  // Run remaining queries in parallel, each with its own try/catch
  const [tutorMetrics, allTutorsForIdle, sessionMetrics, peakHours, bookingMetrics, recentSignups] =
    await Promise.all([
      // Tutor aggregate metrics
      prisma.tutorProfile.aggregate({
        _avg: { responseRate: true, rating: true },
        _sum: { sessionsAssigned: true, sessionsResponded: true },
        _count: true,
      }).catch((err) => {
        console.error("[Admin] tutorProfile.aggregate failed:", err);
        return { _avg: { responseRate: null, rating: null }, _sum: { sessionsAssigned: null, sessionsResponded: null }, _count: 0 };
      }),

      // Idle tutors
      prisma.user.findMany({
        where: {
          role: Role.TUTOR,
          tutorProfile: {
            currentActiveSessions: 0,
            totalAssignmentsToday: 0,
          },
        },
        include: { tutorProfile: true },
      }).catch((err) => {
        console.error("[Admin] idle tutors query failed:", err);
        return [];
      }),

      // Session groupBy
      prisma.session.groupBy({
        by: ["subject"],
        _count: true,
        where: { status: "COMPLETED" },
        orderBy: { _count: { subject: "desc" } },
        take: 5,
      }).catch((err) => {
        console.error("[Admin] session.groupBy failed:", err);
        return [];
      }),

      // Peak hours
      prisma.session.findMany({
        select: { startedAt: true },
        where: { status: "COMPLETED", startedAt: { not: null } },
      }).catch((err) => {
        console.error("[Admin] peak hours query failed:", err);
        return [];
      }),

      // Booking counts (all in one Promise.all with individual catches)
      Promise.all([
        prisma.booking.count({ where: { status: "confirmed" } }).catch(() => 0),
        prisma.booking.count({ where: { status: "declined" } }).catch(() => 0),
        prisma.booking.count({ where: { status: "student_no_show" } }).catch(() => 0),
        prisma.booking.count({ where: { status: "tutor_no_show" } }).catch(() => 0),
        prisma.booking.count({ where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }).catch(() => 0),
      ]),

      // Recent signups
      prisma.analyticsEvent.findMany({
        where: { eventType: "signup", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        take: 200,
        orderBy: { createdAt: "desc" },
      }).catch((err) => {
        console.error("[Admin] analytics signups query failed:", err);
        return [];
      }),
    ]);

  const idleTutors = allTutorsForIdle.filter(t => {
    const availability = (t as any).tutorProfile?.availability as any;
    return availability?.isOnline === true;
  }).length;

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
