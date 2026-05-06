import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "./dashboard-client";
import { getAdminDashboardMetrics, getTutorApplications } from "@/app/actions/admin";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Normalize role check for consistency
  if (!user || (user.user_metadata?.role || "").toUpperCase() !== "ADMIN") {
    redirect("/dashboard");
  }

  const metrics = await getAdminDashboardMetrics();
  const pendingApplications = await getTutorApplications();

  return (
    <AdminDashboardClient 
      stats={metrics.mainStats} 
      telemetry={metrics.telemetry}
      pendingApplications={pendingApplications} 
      recentUsers={metrics.recentUsers}
      systemLoad={metrics.systemLoad}
      completedSessions={metrics.completedSessions}
    />
  );
}
