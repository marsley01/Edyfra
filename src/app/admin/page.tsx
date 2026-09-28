import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "./dashboard-client";
import { getAdminDashboardMetrics, getTutorApplications } from "@/app/actions/admin";
import { getAdminAnalytics } from "@/app/actions/analytics";
import { isFounderEmail } from "@/utils/admin-guard";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard");
  }

  const isFounder = isFounderEmail(user.email);

  if (!user.email) {
    redirect("/login");
  }

  const adminSupabase = createAdminClient();
  let isDbAdmin = false;

  try {
    const { data: dbUser } = await adminSupabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (dbUser) {
      isDbAdmin = dbUser.role === "ADMIN" || dbUser.role === "FOUNDER";
    }
  } catch (err) {
    console.error("[Admin] Failed to fetch user role:", err);
  }

  if (!isFounder && !isDbAdmin) {
    redirect("/dashboard");
  }

  const [metrics, pendingApplications, analytics] = await Promise.all([
    getAdminDashboardMetrics(),
    getTutorApplications(),
    getAdminAnalytics(),
  ]);

  const [tutorProfilesRes, idleTutorsRes, sessionMetricsRes, peakHoursRes, bookingCounts, recentSignupsRes] =
    await Promise.all([
      adminSupabase.from("tutor_profiles").select("rating, response_rate, total_sessions").then(r => r.data || []),
      adminSupabase.from("tutor_profiles").select("availability").eq("current_active_sessions", 0).eq("total_assignments_today", 0).then(r => r.data || []),
      adminSupabase.from("sessions").select("subject").eq("status", "COMPLETED").then(r => r.data || []),
      adminSupabase.from("sessions").select("started_at").eq("status", "COMPLETED").not("started_at", "is", null).then(r => r.data || []),
      Promise.all([
        adminSupabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed").then(r => r.count || 0),
        adminSupabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "declined").then(r => r.count || 0),
        adminSupabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "student_no_show").then(r => r.count || 0),
        adminSupabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "tutor_no_show").then(r => r.count || 0),
        adminSupabase.from("bookings").select("*", { count: "exact", head: true }).gte("date", new Date(new Date().setHours(0,0,0,0)).toISOString()).then(r => r.count || 0),
      ]),
      adminSupabase.from("analytics_events").select("metadata").eq("event_type", "signup").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: false }).limit(200).then(r => r.data || []),
    ]);

  const avgRating = tutorProfilesRes.length ? tutorProfilesRes.reduce((acc, t) => acc + (t.rating || 0), 0) / tutorProfilesRes.length : 0;
  const avgResponse = tutorProfilesRes.length ? tutorProfilesRes.reduce((acc, t) => acc + (t.response_rate || 0), 0) / tutorProfilesRes.length : 0;

  const idleTutors = idleTutorsRes.filter(t => (t.availability as any)?.isOnline === true).length;

  const subjectCounts: Record<string, number> = {};
  sessionMetricsRes.forEach(s => {
    if (s.subject) subjectCounts[s.subject] = (subjectCounts[s.subject] || 0) + 1;
  });
  const topSubjects = Object.entries(subjectCounts)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const hourCounts: Record<number, number> = {};
  peakHoursRes.forEach(s => {
    if (s.started_at) {
      const hour = new Date(s.started_at).getHours();
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
