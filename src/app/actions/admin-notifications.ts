// Admin error notification system
"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import prisma from "@/lib/prisma";
import { Role } from "@/generated/client";
import { getAdminCaller } from "@/app/actions/_admin-guard";

interface ErrorNotificationParams {
  type: string;
  message: string;
  stack?: string;
  endpoint?: string;
  userId?: string;
}

// Send error notification to all admins
export async function sendErrorNotification(params: ErrorNotificationParams) {
  try {
    // This is a "use server" export, so it is reachable from the browser:
    // only an admin session may trigger admin alerts (prevents alert spam).
    if (!(await getAdminCaller())) return;

    const { type, message, stack, endpoint, userId } = params;

    // Prisma "User" is the real users table (there is no public.users table).
    const admins = await prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.FOUNDER] } },
      select: { id: true },
    });

    if (!admins || admins.length === 0) {
      console.error("No admins found to notify about error:", message);
      return;
    }

    const { notifyManyUsers } = await import("@/app/actions/notifications");
    await notifyManyUsers(
      admins.map((admin: { id: string }) => admin.id),
      {
        type: "ERROR_ALERT",
        title: `System Error: ${type}`,
        body: `Error: ${message}${endpoint ? `\nEndpoint: ${endpoint}` : ""}${userId ? `\nUser: ${userId}` : ""}`,
        actionUrl: "/admin/notifications",
      }
    );

    console.log(`Error notification sent to ${admins.length} admin(s)`);
  } catch (error) {
    console.error("Failed to send error notification:", error);
  }
}

// Get all notifications for admin
export async function getAdminNotifications(adminId: string) {
  try {
    if (!(await getAdminCaller())) return [];
    const supabase = createAdminClient();
    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", adminId)
      .order("created_at", { ascending: false })
      .limit(50);

    return (notifications || []).map(n => ({
      ...n,
      createdAt: n.created_at,
      userId: n.user_id,
      actionUrl: n.action_url,
    }));
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    return [];
  }
}

// Mark notification as read
export async function markNotificationRead(notificationId: string) {
  try {
    if (!(await getAdminCaller())) return { success: false, error: "Unauthorized" };
    const supabase = createAdminClient();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: "Failed to mark as read" };
  }
}

// Mark every notification in the platform log as read
export async function markAllNotificationsRead() {
  try {
    if (!(await getAdminCaller())) return { success: false, error: "Unauthorized" };
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false)
      .select("id");
    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, error: "Failed to mark all as read" };
  }
}

// Clear (delete) all notifications from the platform log
export async function clearAllNotifications() {
  try {
    if (!(await getAdminCaller())) return { success: false, error: "Unauthorized" };
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("notifications")
      .delete()
      .not("id", "is", null)
      .select("id");
    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error("Error clearing notifications:", error);
    return { success: false, error: "Failed to clear notifications" };
  }
}