// Simplified Admin Tutor Management Actions
"use server";

import prisma from "@/lib/prisma";
import { Role, VerifPath } from "@prisma/client";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Get all tutor applications with user details (ALL statuses)
export async function getTutorApplicationsWithDetails() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No user found");
      return [];
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!adminUser || adminUser.role !== Role.ADMIN) {
      console.error("Unauthorized: Admin access required");
      return [];
    }

    // Get ALL applications (not just pending) with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Database query timeout")), 10000)
    );

    const queryPromise = (prisma.tutorApplication as any).findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });

    const applications = await Promise.race([queryPromise, timeoutPromise]) as any[];
    return applications || [];
  } catch (error) {
    console.error("Error fetching tutor applications:", error);
    return [];
  }
}

// Get ALL tutors (users with TUTOR role) with their profiles
export async function getAllTutorsWithDetails() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No user found");
      return [];
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!adminUser || adminUser.role !== Role.ADMIN) {
      console.error("Unauthorized: Admin access required");
      return [];
    }

    // Get all users with TUTOR role
    const tutors = await prisma.user.findMany({
      where: { role: Role.TUTOR },
      include: {
        tutorProfile: true,
        tutorApplication: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    });

     // Transform to match the expected format in the UI
     return tutors.map((tutor: any) => ({
       id: tutor.tutorApplication?.[0]?.id || tutor.id,
       status: tutor.tutorApplication?.[0]?.status || "APPROVED",
       createdAt: tutor.tutorApplication?.[0]?.createdAt || tutor.createdAt,
       subjects: tutor.tutorProfile?.subjects || [],
       path: tutor.tutorApplication?.[0]?.path || "Direct Registration",
       notes: tutor.tutorProfile?.bio || "",
       userId: tutor.id,
       user: {
         name: tutor.name,
         educationLevel: tutor.educationLevel,
         email: tutor.email
       }
     }));
  } catch (error) {
    console.error("Error fetching all tutors:", error);
    return [];
  }
}

// Approve tutor application - simplified version
export async function approveTutorApplicationEnhanced(applicationId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized: No user found");
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!adminUser || adminUser.role !== Role.ADMIN) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get the application with timeout
    const app = await (prisma.tutorApplication as any).findUnique({
      where: { id: applicationId },
      include: { user: true }
    });

    if (!app) {
      throw new Error("Application not found");
    }

    // Update user role to TUTOR
    await prisma.user.update({
      where: { id: app.userId },
      data: { role: Role.TUTOR }
    });

    // Create or update tutor profile
    await prisma.tutorProfile.upsert({
      where: { userId: app.userId },
      create: {
        userId: app.userId,
        subjects: app.subjects || [],
        levelsTaught: [],
        verificationPath: app.path || VerifPath.POINTS,
        hourlyRate: 500,
        bio: app.notes || "Expert tutor ready to help students succeed.",
        isVerified: true,
        verifiedAt: new Date(),
        availability: { isOnline: true }
      },
      update: {
        isVerified: true,
        verifiedAt: new Date()
      }
    });

    // Update application status
    await (prisma.tutorApplication as any).update({
      where: { id: applicationId },
      data: { status: "APPROVED" }
    });

    // Add notification to tutor
    try {
      await (prisma.notification as any).create({
        data: {
          userId: app.userId,
          type: "TUTOR_APPROVED",
          title: "Application Approved!",
          body: "Congratulations! Your expert dashboard has been activated. You can now start accepting study sessions.",
          actionUrl: "/tutor"
        }
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }

    revalidatePath("/admin/tutors");
    revalidatePath("/dashboard/tutors");
    return { success: true, message: "Tutor approved successfully" };
  } catch (error) {
    console.error("Error approving tutor:", error);
    throw new Error(`Failed to approve tutor application: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Reject tutor application
export async function rejectTutorApplication(applicationId: string, reason?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized: No user found");
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!adminUser || adminUser.role !== Role.ADMIN) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get the application
    const app = await (prisma.tutorApplication as any).findUnique({
      where: { id: applicationId }
    });

    if (!app) {
      throw new Error("Application not found");
    }

    // Update application status
    await (prisma.tutorApplication as any).update({
      where: { id: applicationId },
      data: { 
        status: "REJECTED",
        notes: reason || "Application rejected by admin"
      }
    });

    // Add notification to applicant
    try {
      await (prisma.notification as any).create({
        data: {
          userId: app.userId,
          type: "TUTOR_REJECTED",
          title: "Application Update",
          body: reason || "Your tutor application was not approved at this time. Please contact support for more information.",
          actionUrl: "/dashboard"
        }
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }

    revalidatePath("/admin/tutors");
    return { success: true, message: "Application rejected" };
  } catch (error) {
    console.error("Error rejecting tutor:", error);
    throw new Error(`Failed to reject tutor application: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Get tutor statistics for admin dashboard
export async function getTutorStatsForAdmin() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized: No user found");
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!adminUser || adminUser.role !== Role.ADMIN) {
      throw new Error("Unauthorized: Admin access required");
    }

    const [totalTutors, verifiedTutors, pendingApplications, activeSessions, totalSessions] = await Promise.all([
      prisma.user.count({ where: { role: Role.TUTOR } }),
      prisma.tutorProfile.count({ where: { isVerified: true } }),
      (prisma.tutorApplication as any).count({ where: { status: "PENDING" } }),
      prisma.session.count({ where: { status: "ACTIVE" } }),
      prisma.session.count({ where: { status: "COMPLETED" } })
    ]);

    return {
      totalTutors,
      verifiedTutors,
      pendingApplications,
      activeSessions,
      totalSessions,
      verificationRate: totalTutors > 0 ? Math.round((verifiedTutors / totalTutors) * 100) : 0
    };
  } catch (error) {
    console.error("Error getting tutor stats:", error);
    return {
      totalTutors: 0,
      verifiedTutors: 0,
      pendingApplications: 0,
      activeSessions: 0,
      totalSessions: 0,
      verificationRate: 0
    };
  }
}