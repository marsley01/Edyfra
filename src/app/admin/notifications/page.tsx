import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { getAdminDashboardMetrics } from "@/app/actions/admin";
import { AdminNotificationsClient } from "./notifications-client";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminSupabase = createAdminClient();
  const dbUser = user ? (
    await adminSupabase
      .from("users")
      .select("role")
      .or(`id.eq.${user.id}${user.email ? `,email.eq.${user.email}` : ""}`)
      .limit(1)
      .maybeSingle()
  )?.data : null;

  if (!user || dbUser?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { data: notifications } = await adminSupabase
    .from("notifications")
    .select("*, user:users!user_id ( name, email, role )")
    .order("created_at", { ascending: false })
    .limit(50);

  const metrics = await getAdminDashboardMetrics();

  return (
    <AdminNotificationsClient 
      notifications={(notifications || []).map(n => ({
        ...n,
        createdAt: n.created_at,
        userId: n.user_id,
      }))}
      stats={metrics.mainStats}
    />
  );
}
