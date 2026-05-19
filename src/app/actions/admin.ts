"use server";

import prisma from "@/lib/prisma";
import { Role } from "@/generated/client";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { TUTOR_CONFIG } from "@/lib/config";
import { isFounderEmail } from "@/utils/admin-guard";

export type AdminGlobalSettings = {
  googleAiKey?: string;
  accentColor?: string;
  maintenanceMode?: boolean;
  registrationGate?: boolean;
  dataCluster?: string;
  aiProvider?: string;
  aiMatchmaking?: boolean;
  pointsMultiplier?: string;
  tutorEarnings?: boolean;
  updatedAt?: string;
  [key: string]: unknown;
};

// Helper: check if current user is an admin (used by server-only contexts)
async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check founder env vars first
    if (isFounderEmail(user?.email)) return true;

    // Fallback to database role
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });
    return dbUser?.role === Role.ADMIN;
  } catch {
    return false;
  }
}

// Client-callable admin check (checks both env vars AND database role)
export async function checkAdminStatus(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // First check if email is in founder env vars
    if (isFounderEmail(user?.email)) return true;

    // Also check Prisma role — supports users promoted to ADMIN via setupAdminUser()
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });
    if (dbUser?.role === Role.ADMIN) return true;

    return false;
  } catch {
    return false;
  }
}

// --- AUTH & SETUP ---

export async function registerAdmin(formData: any) {
  return { error: "Registration is closed. Admins are set by environment variables only." };
}

// --- USER MANAGEMENT ---

export async function getAllUsers() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized: No user found");
    }

    if (!(await isAdmin())) {
      throw new Error("Unauthorized: Admin access required");
    }

    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        studentProfile: true,
        tutorProfile: true
      }
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    throw new Error("Failed to fetch users");
  }
}

export async function deleteUser(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    if (!admin) {
      return { error: "Unauthorized: No admin user found" };
    }

    // Check if user is admin using helper
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return { error: "Unauthorized: Admin access required" };
    }

    // Prevent deleting yourself
    if (userId === admin.id) {
      return { error: "Cannot delete your own admin account" };
    }

    // 1. Delete from Prisma first
    await prisma.user.delete({ where: { id: userId } });

    // 2. Try to delete from Supabase Auth (Requires Service Role Key)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      try {
        const { createClient: createAdminClient } = await import("@supabase/supabase-js");
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await adminClient.auth.admin.deleteUser(userId);
      } catch (supabaseError: any) {
        console.error("Failed to delete from Supabase Auth:", supabaseError);
        // Continue anyway - Prisma deletion was successful
        // But notify via console
      }
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteUser:", error);
    return { error: error.message || "Failed to delete user" };
  }
}

export async function updateUserRoleAdmin(userId: string, role: Role) {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    if (!admin) {
      return { error: "Unauthorized: No admin user found" };
    }

    // Check if user is admin using helper
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return { error: "Unauthorized: Admin access required" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateUserRoleAdmin:", error);
    return { error: error.message || "Failed to update user role" };
  }
}

// --- SESSION MANAGEMENT ---

export async function getActiveSessions() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !(await isAdmin())) {
      return [];
    }

    return await prisma.session.findMany({
      where: { status: "ACTIVE" },
      orderBy: { startedAt: "desc" }
    });
  } catch (error) {
    console.error("Error in getActiveSessions:", error);
    return [];
  }
}

export async function closeSession(sessionId: string) {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    if (!admin || !(await isAdmin())) {
      return { error: "Unauthorized: Admin access required" };
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { 
        status: "COMPLETED",
        endedAt: new Date()
      }
    });
    revalidatePath("/admin/sessions");
    return { success: true };
  } catch (error: any) {
    console.error("Error in closeSession:", error);
    return { error: error.message || "Failed to close session" };
  }
}

// --- TUTOR VERIFICATION ---

export async function getTutorApplications() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !(await isAdmin())) {
      return [];
    }

    return await prisma.tutorApplication.findMany({
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
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    if (!admin || !(await isAdmin())) {
      return { error: "Unauthorized: Admin access required" };
    }

    const app = await prisma.tutorApplication.findUnique({ where: { id: applicationId } });
    if (!app) return { error: "Application not found" };

    await prisma.user.update({ where: { id: app.userId }, data: { role: Role.TUTOR } });
    await prisma.tutorProfile.upsert({
      where: { userId: app.userId },
      create: {
        userId: app.userId, subjects: app.subjects || [], levelsTaught: [],
        verificationPath: app.path,
        hourlyRate: TUTOR_CONFIG.DEFAULT_HOURLY_RATE_KSH, bio: app.notes || TUTOR_CONFIG.DEFAULT_BIO, isVerified: true, verifiedAt: new Date(),
        availability: { isOnline: false }
      },
      update: { isVerified: true, verifiedAt: new Date() }
    });

    await prisma.tutorApplication.update({ where: { id: applicationId }, data: { status: "APPROVED" } });

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
      await prisma.notification.create({
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
  } catch (error: any) {
    console.error("Error in approveTutorApplication:", error);
    return { error: error.message || "Failed to approve application" };
  }
}

// --- RESOURCE MODERATION ---

export async function getPendingResources() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdmin())) return [];

    return await prisma.resource.findMany({
      where: { status: "pending" },
      include: {
        seller: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch pending resources:", error);
    return [];
  }
}

export async function getAllResources() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdmin())) return [];

    return await prisma.resource.findMany({
      include: {
        seller: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch all resources:", error);
    return [];
  }
}

export async function approveResource(resourceId: string) {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin || !(await isAdmin())) return { error: "Unauthorized" };

    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) return { error: "Resource not found" };

    await prisma.resource.update({
      where: { id: resourceId },
      data: { status: "approved" },
    });

    try {
      await prisma.notification.create({
        data: {
          userId: resource.sellerId,
          type: "RESOURCE_APPROVED",
          title: "Resource Approved!",
          body: `Your resource "${resource.title}" has been approved and is now live.`,
          actionUrl: "/dashboard/resources",
        },
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }

    revalidatePath("/admin/resources");
    return { success: true };
  } catch (error: any) {
    console.error("Error in approveResource:", error);
    return { error: error.message || "Failed to approve resource" };
  }
}

export async function rejectResource(resourceId: string) {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin || !(await isAdmin())) return { error: "Unauthorized" };

    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) return { error: "Resource not found" };

    await prisma.resource.update({
      where: { id: resourceId },
      data: { status: "rejected" },
    });

    try {
      await prisma.notification.create({
        data: {
          userId: resource.sellerId,
          type: "RESOURCE_REJECTED",
          title: "Resource Not Approved",
          body: `Your resource "${resource.title}" was not approved. Please review and resubmit.`,
          actionUrl: "/dashboard/resources",
        },
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }

    revalidatePath("/admin/resources");
    return { success: true };
  } catch (error: any) {
    console.error("Error in rejectResource:", error);
    return { error: error.message || "Failed to reject resource" };
  }
}

// --- ADVANCED TERMINAL ---

export async function resetAllSessions() {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    if (!admin || !(await isAdmin())) {
      return { error: "Unauthorized: Admin access required" };
    }

    // Delete messages first to avoid foreign key violation
    await prisma.message.deleteMany({});
    // Then delete all sessions
    await prisma.session.deleteMany({});
    
    revalidatePath("/admin/sessions");
    return { success: true };
  } catch (error: any) {
    console.error("Error in resetAllSessions:", error);
    return { error: error.message || "Failed to reset sessions" };
  }
}

export async function clearGlobalCache() {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    if (!admin || !(await isAdmin())) {
      return { error: "Unauthorized: Admin access required" };
    }

    // In a real app, this would clear Redis or Vercel Data Cache
    // For now, we'll revalidate all main paths
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Error in clearGlobalCache:", error);
    return { error: error.message || "Failed to clear cache" };
  }
}

export async function saveAdminGlobalSettings(settings: AdminGlobalSettings) {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    if (!admin || !(await isAdmin())) {
      return { error: "Unauthorized: Admin access required" };
    }

    await prisma.platformSettings.upsert({
      where: { key: "global" },
      create: { key: "global", value: settings },
      update: { value: settings },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/ai-settings");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving global settings:", error);
    return { error: error.message || "Failed to save settings" };
  }
}

export async function getAdminGlobalSettings(): Promise<AdminGlobalSettings> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !(await isAdmin())) {
      return {};
    }

    const entry = await prisma.platformSettings.findUnique({
      where: { key: "global" },
    });

    return (entry?.value as AdminGlobalSettings) || {};
  } catch (error) {
    console.error("Error fetching global settings:", error);
    return {};
  }
}

export async function reindexDatabase() {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    if (!admin || !(await isAdmin())) {
      return { error: "Unauthorized: Admin access required" };
    }

    // Reindex all tables - this would typically rebuild indexes
    // For now, we'll just revalidate paths and clear cache
    revalidatePath("/", "layout");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in reindexDatabase:", error);
    return { error: error.message || "Failed to reindex database" };
  }
}

export async function bootstrapSeeds() {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    if (!admin || !(await isAdmin())) {
      return { error: "Unauthorized: Admin access required" };
    }

    // This would typically create initial seed data
    // For now, we'll just revalidate and return success
    revalidatePath("/");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in bootstrapSeeds:", error);
    return { error: error.message || "Failed to bootstrap seeds" };
  }
}

// --- DASHBOARD METRICS ---

export async function getAdminDashboardMetrics() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !(await isAdmin())) {
      // Return safe fallback data
      return {
        mainStats: [
          { label: "Total Scholars", value: 0, trend: "UNAUTHORIZED" },
          { label: "Active Mentors", value: 0, trend: "UNAUTHORIZED" },
          { label: "Syncing Rooms", value: 0, trend: "UNAUTHORIZED" },
          { label: "Knowledge Points", value: 0, trend: "UNAUTHORIZED" },
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
      prisma.tutorApplication.count({ where: { status: "PENDING" } }).catch(() => 0),
      prisma.user.aggregate({ _sum: { points: true } }).catch(() => ({ _sum: { points: 0 } })),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, role: true, createdAt: true }
      }).catch(() => [])
    ]);

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
        { label: "Total Scholars", value: 0, trend: "ERROR" },
        { label: "Active Mentors", value: 0, trend: "ERROR" },
        { label: "Syncing Rooms", value: 0, trend: "ERROR" },
        { label: "Knowledge Points", value: 0, trend: "ERROR" },
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
