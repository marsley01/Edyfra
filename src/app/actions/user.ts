"use server";

import { Role, EduLevel, Tier, VerifPath, Prisma, User, StudentProfile, TutorProfile } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { SESSION_CONFIG, TUTOR_CONFIG } from "@/lib/config";

const getRoleFromMetadata = (metadataRole: string | undefined): Role => {
  if (!metadataRole) return Role.STUDENT; // Default role if metadata is missing
  const upperRole = metadataRole.toUpperCase();
  if (upperRole === "ADMIN") return Role.ADMIN;
  if (upperRole === "TUTOR") return Role.TUTOR;
  return Role.STUDENT; // Fallback for any other unexpected role
};

async function syncSupabaseRoleFromPrisma(supabase: Awaited<ReturnType<typeof createClient>>, prismaRole: Role) {
  // Roles in `user_metadata` are user-editable; Prisma is our source of truth.
  // Keeping metadata in sync improves routing/middleware behavior without granting privileges.
  const { data } = await supabase.auth.getUser();
  const current = (data.user?.user_metadata?.role || "").toUpperCase();
  const desired = prismaRole.toString().toUpperCase();
  if (current !== desired) {
    await supabase.auth.updateUser({ data: { role: desired } });
  }
}

export async function getUserData(): Promise<(User & { studentProfile: StudentProfile | null, tutorProfile: TutorProfile | null }) | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Use findFirst with OR to find the user by ID or Email
    let prismaUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: user.id },
          { email: user.email! }
        ]
      },
      include: {
        studentProfile: true,
        tutorProfile: true
      }
    });

    if (!prismaUser) {

      prismaUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || user.user_metadata?.full_name || "User",
          role: getRoleFromMetadata(user.user_metadata?.role),
          educationLevel: EduLevel.HIGH_SCHOOL,
          county: "Nairobi",
          tier: Tier.BRONZE,
          points: SESSION_CONFIG.NEW_USER_WELCOME_BONUS,
          lastActiveAt: new Date(),
        },
        include: {
          studentProfile: true,
          tutorProfile: true
        }
      });
    } else {
      // Daily Reward Logic
      const lastActive = prismaUser.lastActiveAt;
      const today = new Date();
      const isNewDay = !lastActive || 
        lastActive.getDate() !== today.getDate() || 
        lastActive.getMonth() !== today.getMonth() || 
        lastActive.getFullYear() !== today.getFullYear();

      if (isNewDay) {
        prismaUser = await prisma.user.update({
          where: { id: prismaUser.id },
          data: {
            points: { increment: SESSION_CONFIG.DAILY_ACTIVITY_REWARD },
            lastActiveAt: today,
          },
          include: {
            studentProfile: true,
            tutorProfile: true
          }
        });
      }
    }

    // Keep Supabase metadata aligned for routing checks (middleware/layouts).
    // Do NOT overwrite Prisma role based on metadata (metadata can be missing/outdated).
    await syncSupabaseRoleFromPrisma(supabase, prismaUser.role);

    return prismaUser;
  } catch (error) {
    console.error("Error in getUserData:", error);
    return null;
  }
}

export async function updateProfile(data: { 
  name: string; 
  bio: string;
  subjects?: string[];
  hourlyRate?: number;
  mpesaNumber?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const role = user.user_metadata?.role 
      ? (user.user_metadata.role.toUpperCase() === "TUTOR" ? Role.TUTOR : Role.STUDENT) 
      : Role.STUDENT;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        bio: data.bio,
        // educationLevel and county should not be hardcoded here.
        // If they are meant to be updated, they should be passed in `data`.
      },
    });

    if (role === Role.TUTOR) {
      await prisma.tutorProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          bio: data.bio,
          subjects: data.subjects || [],
          levelsTaught: [],
          verificationPath: VerifPath.POINTS,
          hourlyRate: data.hourlyRate || TUTOR_CONFIG.DEFAULT_HOURLY_RATE_KSH,
          mpesaNumber: data.mpesaNumber || "",
          availability: { isOnline: false }
        },
        update: {
          bio: data.bio,
          subjects: data.subjects || undefined,
          hourlyRate: data.hourlyRate || undefined,
          mpesaNumber: data.mpesaNumber || undefined,
        }
      });
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/tutor/settings");
    revalidatePath("/tutor");
    return { success: true };
  } catch (error) {
    console.error("Error in updateProfile:", error);
    throw error;
  }
}

export async function updateUserRole(role: "STUDENT" | "TUTOR") {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const prismaRole = role === "TUTOR" ? Role.TUTOR : Role.STUDENT;

    // 1. ABSOLUTE SYNC: Find by ID or Email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: user.id },
          ...(user.email ? [{ email: user.email }] : [])
        ]
      },
      include: { tutorProfile: true }
    });

    // 2. Role Locking Logic: Prevent Downgrades
    if (existingUser && existingUser.role === Role.TUTOR && role === "STUDENT") {
      throw new Error("Tutor accounts cannot be converted to Student accounts. Please contact support for administrative assistance.");
    }

    // 3. Update Supabase Metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { role: role }
    });
    if (authError) throw authError;

    if (existingUser) {
      // CRITICAL FIX: DO NOT update the 'id' field as it's the primary key and immutable
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          role: prismaRole,
          educationLevel: existingUser.educationLevel || EduLevel.HIGH_SCHOOL,
          county: existingUser.county || "Nairobi",
          // Reset fields that might be causing validation issues in legacy records
          points: existingUser.points ?? 0,
        }
      });
    } else {
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email || `${user.id}@placeholder.edyfra.com`,
          name: user.user_metadata?.name || user.user_metadata?.full_name || "New User",
          role: prismaRole,
          educationLevel: EduLevel.HIGH_SCHOOL,
          county: "Nairobi",
          tier: Tier.BRONZE,
        }
      });
    }

    revalidatePath("/", "layout");
    revalidatePath("/onboarding");
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateUserRole:", error);
    return { success: false, error: error.message || "Failed to update role" };
  }
}

export async function updateUserSettings(settings: Prisma.InputJsonValue) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await prisma.user.update({
      where: { id: user.id },
      data: { settings }
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Error in updateUserSettings:", error);
    throw error;
  }
}

export async function getGlobalStats() {
  try {
    const [studentCount, tutorCount, sessionCount] = await Promise.all([
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.user.count({ where: { role: Role.TUTOR } }),
      prisma.session.count({ where: { status: "COMPLETED" } }),
    ]);

    return [
      { value: studentCount, label: "Students" },
      { value: tutorCount, label: "Verified Mentors" },
      { value: sessionCount, label: "Study Sessions" },
      { value: 0, label: "Uptime %" },
    ];
  } catch (error) {
    console.error("Error in getGlobalStats:", error);
    return [];
  }
}

export async function createTestTutorAction() {
  try {
    const id = 'test-tutor-' + Math.random().toString(36).substring(7);
    await prisma.user.create({
      data: {
        id,
        email: id + '@edyfra.test',
        name: 'Elite Mentor ' + Math.floor(Math.random() * 100),
        role: Role.TUTOR,
        educationLevel: EduLevel.UNIVERSITY,
        county: 'Nairobi',
        tier: Tier.LEGEND,
        points: 9999,
        tutorProfile: {
          create: {
            subjects: ['Mathematics', 'Physics', 'Chemistry'],
            levelsTaught: ['HIGH_SCHOOL', 'UNIVERSITY'],
            verificationPath: VerifPath.GRADES,
            hourlyRate: 750,
            bio: 'I am a high-performance academic mentor focused on KCSE excellence and competitive edge.',
            isVerified: true,
            verifiedAt: new Date(),
            rating: 5.0,
            availability: { isOnline: true }
          }
        }
      }
    });
    revalidatePath('/dashboard/tutors');
    return { success: true };
  } catch (error) {
    console.error('Error creating test tutor:', error);
    throw error;
  }
}
