import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "./dashboard-client";
import { getAdminDashboardMetrics, getTutorApplications } from "@/app/actions/admin";
import prisma from "@/lib/prisma";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Require authentication
  if (!user) {
    redirect("/login");
  }

  // Use Prisma as the source of truth for role
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        { email: user.email! }
      ]
    }
  });

  const isAdmin = dbUser?.role === "ADMIN" || user.user_metadata?.role === "ADMIN";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Ensure Prisma role is synced with Supabase metadata
  if (dbUser && dbUser.role !== "ADMIN" && user.user_metadata?.role === "ADMIN") {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { role: "ADMIN" }
    });
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
