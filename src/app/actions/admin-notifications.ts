// Admin error notification system
"use server";

import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

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
    const { type, message, stack, endpoint, userId } = params;

    // Get all admin users
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true }
    });

    if (admins.length === 0) {
      console.error("No admins found to notify about error:", message);
      return;
    }

    // Create notifications for all admins
    await prisma.notification.createMany({
       data: admins.map((admin: any) => ({
        userId: admin.id,
        type: "ERROR_ALERT",
        title: `System Error: ${type}`,
        body: `Error: ${message}${endpoint ? `\nEndpoint: ${endpoint}` : ''}${userId ? `\nUser: ${userId}` : ''}`,
        actionUrl: "/admin/notifications",
        metadata: {
          errorType: type,
          stack: stack || null,
          endpoint: endpoint || null,
          timestamp: new Date().toISOString()
        }
      }))
    });

    console.log(`Error notification sent to ${admins.length} admin(s)`);
  } catch (error) {
    console.error("Failed to send error notification:", error);
  }
}

// Get all notifications for admin
export async function getAdminNotifications(adminId: string) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: adminId },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return notifications;
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    return [];
  }
}

// Mark notification as read
export async function markNotificationRead(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: "Failed to mark as read" };
  }
}