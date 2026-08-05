import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getAdminDashboardMetrics } from "@/app/actions/admin";
import prisma from "@/lib/prisma";
import { AdminNotificationsClient } from "./notifications-client";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const dbUser = user ? await prisma.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        ...(user.email ? [{ email: user.email }] : [])
      ]
    },
    select: { role: true }
  }) : null;

  if (!user || dbUser?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true,
        }
      }
    }
  });

  const metrics = await getAdminDashboardMetrics();

  return (
    <AdminNotificationsClient 
       notifications={notifications}
      stats={metrics.mainStats}
    />
  );
}
