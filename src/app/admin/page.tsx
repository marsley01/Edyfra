import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "./dashboard-client";
import { getAdminDashboardMetrics, getTutorApplications } from "@/app/actions/admin";
import { getAdminAnalytics } from "@/app/actions/analytics";
import { getAdminCaller } from "@/app/actions/_admin-guard";
import prisma from "@/lib/prisma";

export default async function AdminDashboard() {
  // Prisma role (ADMIN/FOUNDER) or founder email. The previous check queried a
  // non-existent "users" table, so DB-promoted admins were always redirected.
  const admin = await getAdminCaller();
  if (!admin) {
    redirect("/dashboard");
  }

  const adminSupabase = createAdminClient();

  const [metrics, pendingApplications, analytics] = await Promise.all([
    getAdminDashboardMetrics(),
    getTutorApplications(),
    getAdminAnalytics(),
  ]);

  // TutorProfile / Session are Prisma tables ("TutorProfile", "Session" with
  // camelCase columns); the supabase-js queries against "tutor_profiles" /
  // "sessions" always returned nothing.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [tutorProfilesRes, idleTutorsRes, sessionMetricsRes, peakHoursRes, bookingCounts, recentSignupsRes] =
    await Promise.all([
      prisma.tutorProfile.findMany({ select: { rating: true, responseRate: true, totalSessions: true } }).catch(() => []),
      prisma.tutorProfile.findMany({
        where: { currentActiveSessions: 0, totalAssignmentsToday: 0 },
        select: { availability: true },
      }).catch(() => []),
      prisma.session.groupBy({
        by: ["subject"],
        _count: { _all: true },
        where: { status: "COMPLETED" },
      }).catch(() => [] as { subject: string; _count: { _all: number } }[]),
      prisma.session.findMany({
        select: { startedAt: true },
        where: { status: "COMPLETED", startedAt: { not: null } },
        orderBy: { startedAt: "desc" },
        take: 2000,
      }).catch(() => []),
      Promise.all([
        prisma.booking.count({ where: { status: "confirmed" } }).catch(() => 0),
        prisma.booking.count({ where: { status: "declined" } }).catch(() => 0),
        prisma.booking.count({ where: { status: "student_no_show" } }).catch(() => 0),
        prisma.booking.count({ where: { status: "tutor_no_show" } }).catch(() => 0),
        prisma.booking.count({ where: { date: { gte: startOfToday } } }).catch(() => 0),
      ]),
      adminSupabase.from("analytics_events").select("metadata").eq("event_type", "signup").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]);

  const avgRating = tutorProfilesRes.length ? tutorProfilesRes.reduce((acc, t) => acc + (t.rating || 0), 0) / tutorProfilesRes.length : 0;
  const avgResponse = tutorProfilesRes.length ? tutorProfilesRes.reduce((acc, t) => acc + (t.responseRate || 0), 0) / tutorProfilesRes.length : 0;

  const idleTutors = idleTutorsRes.filter(t => (t.availability as any)?.isOnline === true).length;

  const subjectCounts: Record<string, number> = {};
  sessionMetricsRes.forEach(s => {
    if (s.subject) subjectCounts[s.subject] = (subjectCounts[s.subject] || 0) + s._count._all;
  });
  const topSubjects = Object.entries(subjectCounts)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const hourCounts: Record<number, number> = {};
  peakHoursRes.forEach(s => {
    if (s.startedAt) {
      const hour = new Date(s.startedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });
  const peakHoursArray = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const referralSignups = recentSignupsRes.filter(e => (e.metadata as any)?.referred === true).length;
  const directSignups = recentSignupsRes.length - referralSignups;

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
        avgResponseRate: avgResponse,
        avgRating: avgRating,
        totalAssigned: 0,
        totalResponded: 0,
        idleTutors,
      }}
      sessionMetrics={{
        topSubjects,
        peakHours: peakHoursArray,
        totalCompleted: metrics.completedSessions,
      }}
      bookingMetrics={{
        confirmed: bookingCounts[0],
        declined: bookingCounts[1],
        studentNoShow: bookingCounts[2],
        tutorNoShow: bookingCounts[3],
        today: bookingCounts[4],
      }}
      acquisitionMetrics={{
        direct: directSignups,
        referral: referralSignups,
        total: recentSignupsRes.length,
        signupsToday: analytics.signupsToday,
        signupsThisWeek: analytics.signupsThisWeek,
        signupsThisMonth: analytics.signupsThisMonth,
      }}
    />
  );
}
