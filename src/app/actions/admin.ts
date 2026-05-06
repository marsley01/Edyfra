"use server";

import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ADMIN_CONFIG, TUTOR_CONFIG } from "@/lib/config";

const ADMIN_SECRET_KEY = ADMIN_CONFIG.SECRET_KEY;

// Helper function to check if a user is admin
async function isAdmin(userId: string): Promise<boolean> {
  try {
    // First check Prisma database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    if (user?.role === Role.ADMIN) return true;
    
    // Fallback to Supabase metadata - get user directly from Supabase
    try {
      const { createClient: createAdminClient } = await import("@supabase/supabase-js");
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (serviceRoleKey) {
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        
        const { data: { user: sbUser } } = await adminClient.auth.admin.getUserById(userId);
        if (sbUser?.user_metadata?.role === "ADMIN") {
           // Sync role to Prisma
           await prisma.user.upsert({
             where: { id: userId },
             update: { role: Role.ADMIN },
             create: {
               id: userId,
               email: sbUser.email || '',
               name: sbUser.user_metadata?.name || 'Admin',
               role: Role.ADMIN,
               educationLevel: 'UNIVERSITY',
               county: 'Nairobi'
             }
           });
          return true;
        }
      }
    } catch (sbError) {
      console.error("Supabase admin check failed:", sbError);
    }
    
    return false;
  } catch {
    return false;
  }
}

// --- AUTH & SETUP ---

export async function registerAdmin(formData: any) {
  const { email, password, name, securityKey } = formData;
  if (securityKey !== ADMIN_SECRET_KEY) return { error: "Invalid Key." };

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email, password, options: { data: { name, role: "ADMIN" } }
  });

  if (authError) return { error: authError.message };
  if (!authData.user) return { error: "Failed to create user in Supabase" };
  
   try {
     await prisma.user.upsert({
       where: { id: authData.user.id },
       update: { role: Role.ADMIN },
       create: {
         id: authData.user.id,
         email, name, role: Role.ADMIN,
         educationLevel: "UNIVERSITY",
         county: "Nairobi",
       }
     });
    return { success: true };
  } catch (err) {
    console.error("Prisma error in registerAdmin:", err);
    return { error: `Database error: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

// --- USER MANAGEMENT ---

export async function getAllUsers() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized: No user found");
    }

    // Check if user is admin - check both Prisma and Supabase metadata
    const adminUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    const isAdmin = adminUser?.role === Role.ADMIN || 
                     user.user_metadata?.role === "ADMIN" ||
                     user.user_metadata?.role === "ADMIN";

    if (!isAdmin) {
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
    const adminCheck = await isAdmin(admin.id);
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
    const adminCheck = await isAdmin(admin.id);
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
    
    if (!user || !(await isAdmin(user.id))) {
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
    
    if (!admin || !(await isAdmin(admin.id))) {
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
    
    if (!user || !(await isAdmin(user.id))) {
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
    
    if (!admin || !(await isAdmin(admin.id))) {
      return { error: "Unauthorized: Admin access required" };
    }

    const app = await prisma.tutorApplication.findUnique({ where: { id: applicationId } });
    if (!app) return { error: "Application not found" };

    await prisma.user.update({ where: { id: app.userId }, data: { role: Role.TUTOR } });
    await prisma.tutorProfile.upsert({
      where: { userId: app.userId },
      create: {
        userId: app.userId, subjects: app.subjects, verificationPath: app.path,
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

// --- ADVANCED TERMINAL ---

export async function resetAllSessions() {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    if (!admin || !(await isAdmin(admin.id))) {
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
    
    if (!admin || !(await isAdmin(admin.id))) {
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

export async function saveAdminGlobalSettings(settings: any) {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    if (!admin || !(await isAdmin(admin.id))) {
      return { error: "Unauthorized: Admin access required" };
    }

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
  } catch (error: any) {
    console.error("Error saving global settings:", error);
    return { error: error.message || "Failed to save settings" };
  }
}

export async function getAdminGlobalSettings() {
  try {
    const supabase = await createClient();
    const { data: { user: admin } } = await supabase.auth.getUser();
    
    if (!admin || !(await isAdmin(admin.id))) {
      return {};
    }

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
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !(await isAdmin(user.id))) {
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
