import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "./dashboard-client";
import { getAdminDashboardMetrics, getTutorApplications } from "@/app/actions/admin";
import prisma from "@/lib/prisma";
import { isFounderEmail } from "@/utils/admin-guard";
import { Role } from "@prisma/client";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // DEBUG: Print session email to console to verify what is being checked
  console.log("[ADMIN GUARD] Session email:", user?.email ?? "(no user)");
  console.log("[ADMIN GUARD] ADMIN_EMAIL_1:", process.env.ADMIN_EMAIL_1 ?? "(not set)");
  console.log("[ADMIN GUARD] ADMIN_EMAIL_2:", process.env.ADMIN_EMAIL_2 ?? "(not set)");

  // Check 1: must be logged in and email must be in admin list
  if (!user || !isFounderEmail(user.email)) {
    console.log("[ADMIN GUARD] Blocked — email not in admin list, redirecting to /dashboard");
    redirect("/dashboard");
  }

  // Check 2: Prisma role must be ADMIN
  const prismaUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  console.log("[ADMIN GUARD] Prisma role:", prismaUser?.role ?? "(user not found in DB)");

  if (!prismaUser || prismaUser.role !== Role.ADMIN) {
    console.log("[ADMIN GUARD] Blocked — Prisma role is not ADMIN, redirecting to /dashboard");
    redirect("/dashboard");
  }

  console.log("[ADMIN GUARD] Access granted for:", user.email);

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
