import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "./dashboard-client";
import { getAdminDashboardMetrics, getTutorApplications } from "@/app/actions/admin";
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
