// Simplified Admin Tutor Management Actions
"use server";

import prisma from "@/lib/prisma";
import { Role, VerifPath, TutorApplication, User, TutorProfile } from "@prisma/client";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserData } from "./user";
import { notifyUser } from "@/app/actions/notifications";
import { TUTOR_CONFIG } from "@/lib/config";

async function requireAdminUser() {
  const adminUser = await getUserData();
  if (!adminUser || adminUser.role !== Role.ADMIN) {
    throw new Error("Unauthorized: Admin access required");
  }
  return adminUser;
}

// Get tutor applications with PENDING status only
export async function getTutorApplicationsWithDetails(): Promise<any[]> {
  try {
    await requireAdminUser();

    // Get PENDING applications only with timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Database query timeout")), 10000)
    );

    const queryPromise: Promise<TutorApplication[]> = prisma.tutorApplication.findMany({
      where: { status: "PENDING" },
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });

    const applications = await Promise.race([queryPromise, timeoutPromise]);
    return applications || [];
  } catch (error) {
    console.error("Error fetching tutor applications:", error);
    return [];
  }
}

// Get ALL tutors (users with TUTOR role) with their profiles
export async function getAllTutorsWithDetails(): Promise<any[]> {
  try {
    await requireAdminUser();

    // Get all users with TUTOR role
     const tutors = await prisma.user.findMany({
       where: { role: Role.TUTOR },
       include: {
         tutorProfile: true,
         tutorApplication: true
       },
       orderBy: { createdAt: "desc" }
     });

     // Transform to match the expected format in the UI
     return tutors.map((tutor) => {
       // tutor.tutorApplication is a single object (one-to-one), not an array
       const latestApp = tutor.tutorApplication || null;
       
       return {
         id: latestApp?.id || tutor.id,
         status: latestApp?.status || "APPROVED",
         createdAt: latestApp?.createdAt || tutor.createdAt,
         subjects: tutor.tutorProfile?.subjects || [],
         path: latestApp?.path || "Direct Registration",
         notes: tutor.tutorProfile?.bio || "",
         userId: tutor.id,
         user: {
           name: tutor.name,
           educationLevel: tutor.educationLevel,
           email: tutor.email
         }
       };
     });
  } catch (error) {
    console.error("Error fetching all tutors:", error);
    return [];
  }
}

// Approve tutor application - simplified version
export async function approveTutorApplicationEnhanced(applicationId: string) {
  try {
    await requireAdminUser();

    // Get the application with timeout
    const app = await prisma.tutorApplication.findUnique({
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
        hourlyRate: TUTOR_CONFIG.DEFAULT_HOURLY_RATE_KSH,
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
    await prisma.tutorApplication.update({
      where: { id: applicationId },
      data: { 
        status: "APPROVED",
        notes: app.notes || "Application approved"
      }
    });

    // Add notification to tutor
    try {
      await notifyUser(app.userId, {
        type: "TUTOR_APPROVED",
        title: "Application Approved!",
        body: "Congratulations! Your expert dashboard has been activated. You can now start accepting study sessions.",
        actionUrl: "/tutor"
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
    await requireAdminUser();

    // Get the application
    const app = await prisma.tutorApplication.findUnique({
      where: { id: applicationId }
    });

    if (!app) {
      throw new Error("Application not found");
    }

    // Update application status
    await prisma.tutorApplication.update({
      where: { id: applicationId },
      data: { 
        status: "REJECTED",
        notes: reason || "Application rejected by admin"
      }
    });

    // Add notification to applicant
    try {
      await notifyUser(app.userId, {
        type: "TUTOR_REJECTED",
        title: "Application Update",
        body: reason || "Your tutor application was not approved at this time. Please contact support for more information.",
        actionUrl: "/dashboard"
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
    await requireAdminUser();

    const [totalTutors, verifiedTutors, pendingApplications, activeSessions, totalSessions] = await Promise.all([
      prisma.user.count({ where: { role: Role.TUTOR } }),
      prisma.tutorProfile.count({ where: { isVerified: true } }),
      prisma.tutorApplication.count({ where: { status: "PENDING" } }),
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

// Allow existing user to apply to become a tutor
export async function applyToBecomeTutor(formData: {
  subjects: string[];
  bio?: string;
  hourlyRate?: number;
  mpesaNumber?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: "Unauthorized: No user found" };
    }

    // Get user from Prisma
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      return { error: "User not found in database" };
    }

    if (dbUser.role === Role.TUTOR) {
      return { error: "You are already a tutor" };
    }

    // Check if there's already a pending application
    const existingApp = await prisma.tutorApplication.findUnique({
      where: { userId: user.id }
    });

    if (existingApp && existingApp.status === "PENDING") {
      return { error: "You already have a pending application" };
    }

    // Create or update tutor application
    await prisma.tutorApplication.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        path: VerifPath.GRADES,
        gradesUrl: "",
        subjects: formData.subjects || [],
        status: "PENDING",
      },
      update: {
        subjects: formData.subjects || [],
        status: "PENDING",
        notes: formData.bio || existingApp?.notes || "",
      }
    });

    // Update Supabase metadata
    await supabase.auth.updateUser({
      data: { 
        tutorApplicationStatus: "PENDING",
      }
    });

    return { success: true, message: "Application submitted successfully" };
  } catch (error) {
    console.error("Error applying to become tutor:", error);
    return { error: error instanceof Error ? error.message : "Failed to submit application" };
  }
}
