"use server";

import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "EDYFRA_MASTER_2024";

// --- AUTH & SETUP ---

export async function registerAdmin(formData: any) {
  const { email, password, name, securityKey } = formData;
  if (securityKey !== ADMIN_SECRET_KEY) return { error: "Invalid Key." };

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email, password, options: { data: { name, role: "ADMIN" } }
  });

  if (authError) return { error: authError.message };
  
  try {
    await prisma.user.upsert({
      where: { id: authData.user!.id },
      update: { role: Role.ADMIN },
      create: {
        id: authData.user!.id,
        email, name, role: Role.ADMIN,
        educationLevel: "UNIVERSITY",
        county: "Nairobi",
      }
    });
    return { success: true };
  } catch (err) {
    return { error: "Prisma creation failed." };
  }
}

// --- USER MANAGEMENT ---

export async function getAllUsers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      studentProfile: true,
      tutorProfile: true
    }
  });
}

export async function deleteUser(userId: string) {
  const supabase = await createClient();
  const { data: { user: admin } } = await supabase.auth.getUser();
  if (!admin || admin.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  // 1. Wipe from Prisma
  await prisma.user.delete({ where: { id: userId } });

  // 2. Try to wipe from Supabase Auth (Requires Service Role Key)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    await adminClient.auth.admin.deleteUser(userId);
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUserRoleAdmin(userId: string, role: Role) {
  const supabase = await createClient();
  const { data: { user: admin } } = await supabase.auth.getUser();
  if (!admin || admin.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id: userId },
    data: { role }
  });
  revalidatePath("/admin/users");
  return { success: true };
}

// --- SESSION MANAGEMENT ---

export async function getActiveSessions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  return await prisma.session.findMany({
    where: { status: "ACTIVE" },
    orderBy: { startedAt: "desc" }
  });
}

export async function closeSession(sessionId: string) {
  const supabase = await createClient();
  const { data: { user: admin } } = await supabase.auth.getUser();
  if (!admin || admin.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.session.update({
    where: { id: sessionId },
    data: { 
      status: "COMPLETED",
      endedAt: new Date()
    }
  });
  revalidatePath("/admin/sessions");
  return { success: true };
}

// --- TUTOR VERIFICATION ---

export async function getTutorApplications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  try {
    return await (prisma.tutorApplication as any).findMany({
      where: { status: "PENDING" },
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("Failed to fetch tutor applications:", error);
    return [];
  }
}

export async function approveTutorApplication(applicationId: string) {
  const supabase = await createClient();
  const { data: { user: admin } } = await supabase.auth.getUser();
  if (!admin || admin.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  const app = await prisma.tutorApplication.findUnique({ where: { id: applicationId } });
  if (!app) throw new Error("App not found");

  await prisma.user.update({ where: { id: app.userId }, data: { role: Role.TUTOR } });
  await prisma.tutorProfile.upsert({
    where: { userId: app.userId },
    create: {
      userId: app.userId, subjects: app.subjects, verificationPath: app.path,
      hourlyRate: 500, bio: app.notes || "", isVerified: true, verifiedAt: new Date(),
      availability: { isOnline: false }
    },
    update: { isVerified: true, verifiedAt: new Date() }
  });

  await (prisma.tutorApplication as any).update({ where: { id: applicationId }, data: { status: "APPROVED" } });

  // Update Supabase auth user metadata to reflect TUTOR role
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const { createClient: createAdminClient } = await import("@supabase/supabase-js");
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      await adminClient.auth.admin.updateUserById(app.userId, {
        user_metadata: { role: "TUTOR" }
      });
    }
  } catch (e) {
    console.error("Failed to update Supabase user metadata:", e);
  }

  // Add Notification
  try {
    await (prisma.notification as any).create({
      data: {
        userId: app.userId,
        type: "TUTOR_APPROVED",
        title: "Application Approved!",
        body: "Congratulations! Your expert dashboard has been activated.",
        actionUrl: "/tutor"
      }
    });
  } catch (e) {
    console.error("Failed to send notification:", e);
  }

  revalidatePath("/admin/tutors");
  return { success: true };
}

// --- ADVANCED TERMINAL ---

export async function resetAllSessions() {
  const supabase = await createClient();
  const { data: { user: admin } } = await supabase.auth.getUser();
  if (!admin || admin.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.session.deleteMany({});
  revalidatePath("/admin/sessions");
  return { success: true };
}

export async function clearGlobalCache() {
  const supabase = await createClient();
  const { data: { user: admin } } = await supabase.auth.getUser();
  if (!admin || admin.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  // In a real app, this would clear Redis or Vercel Data Cache
  // For now, we'll revalidate all main paths
  revalidatePath("/", "layout");
  return { success: true };
}

export async function saveAdminGlobalSettings(settings: any) {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin || admin.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

    // We store global settings in the current admin's settings JSON
    // The AI services will look for an ADMIN user to find these settings
    await prisma.user.update({
      where: { id: admin.id },
      data: { 
        settings: settings 
      }
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Error saving global settings:", error);
    throw error;
  }
}

export async function getAdminGlobalSettings() {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin || admin.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

    const adminData = await prisma.user.findUnique({
      where: { id: admin.id },
      select: { settings: true }
    });

    return adminData?.settings || {};
  } catch (error) {
    console.error("Error fetching global settings:", error);
    return {};
  }
}

// --- DASHBOARD METRICS ---

export async function getAdminDashboardMetrics() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  try {
    const [
      totalUsers, 
      studentCount, 
      tutorCount, 
      activeSessions, 
      completedSessions,
      pendingApps,
      totalPoints,
      recentUsers
    ] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.user.count({ where: { role: Role.STUDENT } }).catch(() => 0),
      prisma.user.count({ where: { role: Role.TUTOR } }).catch(() => 0),
      prisma.session.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      prisma.session.count({ where: { status: "COMPLETED" } }).catch(() => 0),
      (prisma.tutorApplication as any).count({ where: { status: "PENDING" } }).catch(() => 0),
      prisma.user.aggregate({ _sum: { points: true } }).catch(() => ({ _sum: { points: 0 } })),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, role: true, createdAt: true }
      }).catch(() => [])
    ]);

    // Generate growth telemetry
    const telemetry = [
      { label: "Live Scholars", value: studentCount, trend: "SYNCED" },
      { label: "Expert Velocity", value: tutorCount > 0 ? (completedSessions / tutorCount).toFixed(1) : 0, trend: "ACTIVE" },
      { label: "Global Uptime", value: "99.98%", trend: "OPTIMAL" },
      { label: "Sync Latency", value: "14ms", trend: "FAST" }
    ];

    const totalActivePoints = totalPoints._sum?.points || 0;
    const avgPointsPerUser = totalUsers > 0 ? Math.round(totalActivePoints / totalUsers) : 0;
    const completionRate = (activeSessions + completedSessions) > 0 
      ? Math.round((completedSessions / (activeSessions + completedSessions)) * 100) 
      : 0;

    return {
      mainStats: [
        { label: "Total Scholars", value: studentCount, trend: "LIVE" },
        { label: "Active Mentors", value: tutorCount, trend: "LIVE" },
        { label: "Syncing Rooms", value: activeSessions, trend: "ACTIVE" },
        { label: "Knowledge Points", value: totalActivePoints, trend: "CIRCULATING" },
      ],
      telemetry: [
        { label: "Students", value: studentCount, trend: "REGISTERED" },
        { label: "Tutors", value: tutorCount, trend: "ACTIVE" },
        { label: "Completion %", value: completionRate, trend: completionRate > 50 ? "HEALTHY" : "LOW" },
        { label: "Avg Points", value: avgPointsPerUser, trend: "TRACKING" }
      ],
      pendingAppsCount: pendingApps,
      completedSessions,
      recentUsers,
      systemLoad: activeSessions > 0 ? Math.min(Math.round((activeSessions / Math.max(studentCount, 1)) * 100), 100) : 0,
    };
  } catch (error) {
    console.error("Failed to load admin metrics:", error);
    // Return safe fallback data to keep dashboard functional
    return {
      mainStats: [
        { label: "Total Scholars", value: 0, trend: "N/A" },
        { label: "Active Mentors", value: 0, trend: "N/A" },
        { label: "Syncing Rooms", value: 0, trend: "N/A" },
        { label: "Knowledge Points", value: 0, trend: "N/A" },
      ],
      telemetry: [
        { label: "Students", value: 0, trend: "UNAVAILABLE" },
        { label: "Tutors", value: 0, trend: "UNAVAILABLE" },
        { label: "Completion %", value: 0, trend: "UNAVAILABLE" },
        { label: "Avg Points", value: 0, trend: "UNAVAILABLE" }
      ],
      pendingAppsCount: 0,
      completedSessions: 0,
      recentUsers: [],
      systemLoad: 0,
    };
  }
}
