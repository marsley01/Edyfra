"use server";

import { Role, EduLevel, Tier, VerifPath, Prisma, User, StudentProfile, TutorProfile, Gender } from "@/generated/client";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { SESSION_CONFIG, TUTOR_CONFIG, TIER_CONFIG } from "@/lib/config";

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

      const metaGender = user.user_metadata?.gender;
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
          avatar: user.user_metadata?.avatar || null,
          gender: metaGender === "MALE" ? Gender.MALE : metaGender === "FEMALE" ? Gender.FEMALE : undefined,
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

    // Tier recalibration: keep tier in sync with points
    const correctTier = TIER_CONFIG.getTierFromPoints(prismaUser.points);
    if (prismaUser.tier !== correctTier) {
      prismaUser = await prisma.user.update({
        where: { id: prismaUser.id },
        data: { tier: correctTier as Tier },
        include: { studentProfile: true, tutorProfile: true }
      });
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
  educationLevel?: string;
  county?: string;
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
        ...(data.educationLevel && { educationLevel: data.educationLevel as EduLevel }),
        ...(data.county && { county: data.county }),
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
      const metaGender = user.user_metadata?.gender;
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email || `${user.id}@placeholder.edyfra.com`,
          name: user.user_metadata?.name || user.user_metadata?.full_name || "New User",
          role: prismaRole,
          educationLevel: EduLevel.HIGH_SCHOOL,
          county: "Nairobi",
          tier: Tier.BRONZE,
          avatar: user.user_metadata?.avatar || null,
          gender: metaGender === "MALE" ? Gender.MALE : metaGender === "FEMALE" ? Gender.FEMALE : undefined,
        }
      });
    }

    // Fix critical infinite redirect loop
    if (role === "STUDENT") {
      revalidatePath("/dashboard");
    } else {
      revalidatePath("/tutor/dashboard");
    }
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

export async function updateUserPreferences(prefs: {
  theme?: string;
  accentColor?: string;
  layout?: string;
  fontSize?: string;
  preferredLanguage?: string;
  studyTime?: string;
  sessionLength?: string;
  sessionTypePref?: string;
  showProfile?: boolean;
  showOnlineStatus?: boolean;
  allowTutorRequests?: boolean;
  enableMashFallback?: boolean;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const allowed = [
      "theme", "accentColor", "layout", "fontSize", "preferredLanguage",
      "studyTime", "sessionLength", "sessionTypePref", "showProfile",
      "showOnlineStatus", "allowTutorRequests", "enableMashFallback",
    ];
    const cleanPrefs = Object.fromEntries(
      Object.entries(prefs).filter(([k]) => allowed.includes(k) && prefs[k as keyof typeof prefs] !== undefined)
    );

    const existing = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });

    const merged = { ...(existing || {}), ...cleanPrefs };
    delete (merged as any).id;
    delete (merged as any).userId;
    delete (merged as any).updatedAt;
    delete (merged as any).createdAt;

    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...cleanPrefs },
      update: merged,
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Error in updateUserPreferences:", error);
    throw error;
  }
}

export async function updateNotificationSettings(preferences: Record<string, boolean>) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const existing = await prisma.notificationSettings.findUnique({
      where: { userId: user.id },
    });

    const merged = { ...((existing?.preferences as Record<string, boolean>) || {}), ...preferences };

    await prisma.notificationSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, preferences: merged },
      update: { preferences: merged },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Error in updateNotificationSettings:", error);
    throw error;
  }
}

export async function updateTutorProfile(data: {
  name?: string;
  bio?: string;
  subjects?: string[];
  levelsTaught?: string[];
  hourlyRate?: number;
  mpesaNumber?: string;
  availability?: any;
  confidenceLevels?: Record<string, number>;
  defaultSessionDuration?: number;
  allowSessionRecording?: boolean;
  showRatingPublicly?: boolean;
  allowReRequest?: boolean;
  autoAcceptRequests?: boolean;
  maxGroupStudents?: number;
  sessionPreference?: string;
  allowMashInactive?: boolean;
  showMashSummary?: boolean;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    if (data.name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: data.name, bio: data.bio },
      });
    }

    await prisma.tutorProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        bio: data.bio || "",
        subjects: data.subjects || [],
        levelsTaught: data.levelsTaught || [],
        verificationPath: VerifPath.POINTS,
        hourlyRate: data.hourlyRate || 500,
        mpesaNumber: data.mpesaNumber || "",
        availability: data.availability || { isOnline: false },
      },
      update: {
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.subjects !== undefined && { subjects: data.subjects }),
        ...(data.levelsTaught !== undefined && { levelsTaught: data.levelsTaught }),
        ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
        ...(data.mpesaNumber !== undefined && { mpesaNumber: data.mpesaNumber }),
        ...(data.availability !== undefined && { availability: data.availability }),
      },
    });

    revalidatePath("/tutor/settings");
    revalidatePath("/tutor");
    return { success: true };
  } catch (error) {
    console.error("Error in updateTutorProfile:", error);
    throw error;
  }
}

export async function updateStudentProfile(data: {
  name?: string;
  bio?: string;
  educationLevel?: string;
  subjects?: string[];
  studyHoursPerWeek?: number;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.educationLevel) updateData.educationLevel = data.educationLevel as EduLevel;

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({ where: { id: user.id }, data: updateData });
    }

    if (data.subjects) {
      const existingProfile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
      if (existingProfile) {
        await prisma.studentProfile.update({ where: { userId: user.id }, data: { subjects: data.subjects } });
      } else {
        await prisma.studentProfile.create({ data: { userId: user.id, subjects: data.subjects, studyStyle: "", preferredTimes: {}, goals: [], weakTopics: [] } });
      }
    }

    if (data.studyHoursPerWeek !== undefined) {
      const existingSettings = await prisma.user.findUnique({ where: { id: user.id }, select: { settings: true } });
      const settings = { ...((existingSettings?.settings as any) || {}), studyHoursPerWeek: data.studyHoursPerWeek };
      await prisma.user.update({ where: { id: user.id }, data: { settings } });
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Error in updateStudentProfile:", error);
    throw error;
  }
}

export async function updateAvatar(avatarUrl: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await prisma.user.update({
      where: { id: user.id },
      data: { avatar: avatarUrl },
    });

    await supabase.auth.updateUser({
      data: { avatar: avatarUrl },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/tutor/settings");
    return { success: true };
  } catch (error) {
    console.error("Error in updateAvatar:", error);
    throw error;
  }
}

export async function downloadUserData() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const [userData, userPrefs, notifPrefs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        include: { studentProfile: true, tutorProfile: true },
      }),
      prisma.userPreferences.findUnique({ where: { userId: user.id } }),
      prisma.notificationSettings.findUnique({ where: { userId: user.id } }),
    ]);

    return { success: true, data: JSON.stringify({ ...userData, userPreferences: userPrefs, notificationSettings: notifPrefs }, null, 2) };
  } catch (error) {
    console.error("Error in downloadUserData:", error);
    throw error;
  }
}

export async function deleteUserAccount() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await prisma.user.delete({ where: { id: user.id } });

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const { createClient: createAdminClient } = await import("@supabase/supabase-js");
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      await adminClient.auth.admin.deleteUser(user.id);
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteUserAccount:", error);
    throw error;
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error("User not found");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) throw new Error("Current password is incorrect");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (error) {
    console.error("Error in changePassword:", error);
    throw error;
  }
}

export async function changeEmail(newEmail: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (error) {
    console.error("Error in changeEmail:", error);
    throw error;
  }
}

export async function getGlobalStats() {
  try {
    const [studentCount, tutorCount, sessionCount, resourceCount] = await Promise.all([
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.tutorProfile.count({ where: { isVerified: true } }),
      prisma.session.count({ where: { status: "COMPLETED" } }),
      prisma.resource.count({ where: { status: "approved" } }),
    ]);

    return [
      { value: studentCount, label: "Students Joined" },
      { value: tutorCount, label: "Verified Tutors" },
      { value: sessionCount, label: "Sessions Completed" },
      { value: resourceCount, label: "Resources Shared" },
    ];
  } catch (error) {
    console.error("Error in getGlobalStats:", error);
    return [];
  }
}

export async function getLeaderboard(educationLevel: EduLevel) {
  try {
    const leaders = await prisma.user.findMany({
      where: { educationLevel },
      select: {
        id: true,
        name: true,
        avatar: true,
        points: true,
        educationLevel: true,
        tier: true,
      },
      orderBy: { points: "desc" },
      take: 20,
    });
    return leaders;
  } catch (error) {
    console.error("Error in getLeaderboard:", error);
    return [];
  }
}

export async function getCommunityScholars() {
  try {
    const legends = await prisma.user.findMany({
      where: { role: Role.STUDENT, tier: Tier.LEGEND },
      select: { id: true, name: true, county: true, points: true, tier: true },
      orderBy: { points: "desc" },
      take: 3,
    });
    if (legends.length > 0) return legends;

    return prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: { id: true, name: true, county: true, points: true, tier: true },
      orderBy: { points: "desc" },
      take: 4,
    });
  } catch (error) {
    console.error("Error in getCommunityScholars:", error);
    return [];
  }
}

export async function recalibrateTier(userId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true, tier: true } });
    if (!user) return;
    const correctTier = TIER_CONFIG.getTierFromPoints(user.points);
    if (user.tier !== correctTier) {
      await prisma.user.update({ where: { id: userId }, data: { tier: correctTier as Tier } });
    }
  } catch (error) {
    console.error("Error recalibrating tier:", error);
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
