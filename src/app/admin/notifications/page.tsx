import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getAdminDashboardMetrics } from "@/app/actions/admin";
import { getAdminCaller } from "@/app/actions/_admin-guard";
import { AdminNotificationsClient } from "./notifications-client";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  // Prisma role is the source of truth (the old check queried a non-existent
  // "users" table, so every admin was bounced to /dashboard).
  const admin = await getAdminCaller();
  if (!admin) {
    redirect("/dashboard");
  }

  const adminSupabase = createAdminClient();
  // notifications.user_id references auth.users, so PostgREST cannot embed the
  // Prisma "User" row — fetch names separately below.
  const { data: notifications } = await adminSupabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = notifications || [];
  const userIds = Array.from(new Set(rows.map((n) => n.user_id).filter(Boolean))) as string[];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, role: true },
      })
    : [];
  const usersById = new Map(users.map((u) => [u.id, u]));

  const metrics = await getAdminDashboardMetrics();

  return (
    <AdminNotificationsClient
      notifications={rows.map(n => ({
        ...n,
        createdAt: n.created_at,
        userId: n.user_id,
        actionUrl: n.action_url,
        user: usersById.get(n.user_id) ?? null,
      }))}
      stats={metrics.mainStats}
    />
  );
}
