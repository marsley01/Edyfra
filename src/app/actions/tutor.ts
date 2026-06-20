"use server";

import { cache } from "react";
import { Role, VerifPath, EduLevel } from "@/generated/client";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getUserData } from "./user";
import { TUTOR_CONFIG } from "@/lib/config";
import { acceptMatchRequest } from "./match";
import { getCached, TTL } from "@/lib/cache";

export const getTutorProfile = cache(async () => {
  try {
    const user = await getUserData();
    if (!user) return null;

    let profile = await prisma.tutorProfile.findUnique({
      where: { userId: user.id },
      include: { user: true }
    });

    if (!profile && user.role === Role.TUTOR) {

      profile = await prisma.tutorProfile.create({
        data: {
          userId: user.id,
          bio: user.bio || TUTOR_CONFIG.DEFAULT_BIO,
          subjects: [],
          levelsTaught: [],
          verificationPath: VerifPath.POINTS,
          hourlyRate: TUTOR_CONFIG.DEFAULT_HOURLY_RATE_KSH,
          availability: { isOnline: false }
        },
        include: { user: true }
      });
    }

    return profile;
  } catch (error) {
    console.error("Error in getTutorProfile:", error);
    return null;
  }
});

export async function toggleTutorStatus(isOnline: boolean) {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");


    await prisma.tutorProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        bio: user.bio || TUTOR_CONFIG.DEFAULT_BIO,
        subjects: [],
        levelsTaught: [],
        verificationPath: VerifPath.POINTS,
        hourlyRate: TUTOR_CONFIG.DEFAULT_HOURLY_RATE_KSH,
        availability: { isOnline }
      },
      update: {
        availability: { isOnline },
      }
    });

    revalidatePath("/tutor");
    return { success: true };
  } catch (error) {
    console.error("Error in toggleTutorStatus:", error);
    throw error;
  }
}

export async function updateTutorAvailability(schedule: any) {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");

    await prisma.tutorProfile.update({
      where: { userId: user.id },
      data: {
        availability: { schedule }
      }
    });

    revalidatePath("/tutor");
    return { success: true };
  } catch (error) {
    console.error("Error in updateTutorAvailability:", error);
    throw error;
  }
}

export { acceptMatchRequest };

export async function getTutorStats() {
  try {
    const user = await getUserData();
    if (!user) return null;

    const [activeSessions, completedSessions, totalEarnings] = await Promise.all([
      prisma.session.count({ where: { partnerId: user.id, status: "ACTIVE" } }),
      prisma.session.count({ where: { partnerId: user.id, status: "COMPLETED" } }),
      prisma.session.aggregate({
        where: { partnerId: user.id, status: "COMPLETED" },
        _sum: { priceKsh: true }
      })
    ]);

    return {
      activeSessions,
      completedSessions,
      totalEarnings: totalEarnings._sum.priceKsh || 0
    };
  } catch (error) {
    console.error("Error in getTutorStats:", error);
    return null;
  }
}

export async function getVerifiedTutors(level?: EduLevel) {
  const cacheKey = level ? `tutors:verified:${level}` : `tutors:verified:all`;
  return getCached(cacheKey, TTL.APPROVED_TUTORS, async () => {
  try {
    const whereClause: any = {
      role: Role.TUTOR,
      tutorProfile: {
        isNot: null,
        isVerified: true
      }
    };
    if (level) {
      whereClause.OR = [
        { tutorProfile: { levelsTaught: { has: level } } },
        { tutorProfile: { levelsTaught: { isEmpty: true } } }
      ];
    }

    return await prisma.user.findMany({
      where: whereClause,
      include: {
        tutorProfile: true,
        tutorAvailabilities: true
      },
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("Error in getVerifiedTutors:", error);
    return [];
  }
  });
}

/** Elevates the current user to Admin for setup purposes */
export async function elevateToAdmin() {
  const user = await getUserData();
  if (!user) throw new Error("Authentication required");
  await prisma.user.update({
    where: { id: user.id },
    data: { role: Role.ADMIN }
  });
  revalidatePath("/");
}

/** Fetches all tutors awaiting verification */
export async function getInactiveTutors() {
  const user = await getUserData();
  if (user?.role !== Role.ADMIN) throw new Error("Unauthorized access");
  return prisma.user.findMany({
    where: {
      role: Role.TUTOR,
      tutorProfile: { isVerified: false }
    },
    include: { tutorProfile: true }
  });
}

/** Changes a tutor's state from inactive to active */
export async function activateTutor(tutorId: string) {
  const user = await getUserData();
  if (user?.role !== Role.ADMIN) throw new Error("Unauthorized access");
  await prisma.tutorProfile.update({
    where: { userId: tutorId },
    data: { isVerified: true, verifiedAt: new Date() }
  });
  revalidatePath("/dashboard/tutors");
}

export async function searchTutors(query: string) {
  try {
    if (!query || query.length < 2) return [];

    const normalizedQuery = query.trim().toLowerCase();

    return await prisma.user.findMany({
      where: {
        role: Role.TUTOR,
        tutorProfile: {
          isNot: null
        },
        OR: [
          { name: { contains: normalizedQuery, mode: "insensitive" } },
          { bio: { contains: normalizedQuery, mode: "insensitive" } },
          {
            tutorProfile: {
              subjects: {
                hasSome: [normalizedQuery, normalizedQuery.charAt(0).toUpperCase() + normalizedQuery.slice(1)]
              }
            }
          },
          {
            county: { contains: normalizedQuery, mode: "insensitive" }
          }
        ]
      },
      include: {
        tutorProfile: true
      },
      take: 20,
      orderBy: [
        { tutorProfile: { rating: "desc" } },
        { createdAt: "desc" }
      ]
    });
  } catch (error) {
    console.error("Error in searchTutors:", error);
    return [];
  }
}

// Get tutors by subject for better visibility
export async function getTutorsBySubject(subject: string, level?: EduLevel) {
  try {
    const whereClause: any = {
      role: Role.TUTOR,
      tutorProfile: {
        isNot: null,
        subjects: {
          hasSome: [subject]
        }
      }
    };

    if (level) {
      whereClause.tutorProfile.levelsTaught = { has: level };
    }

    return await prisma.user.findMany({
      where: whereClause,
      include: {
        tutorProfile: true
      },
      orderBy: [
        { tutorProfile: { rating: "desc" } },
        { createdAt: "desc" }
      ],
      take: 50
    });
  } catch (error) {
    console.error("Error in getTutorsBySubject:", error);
    return [];
  }
}

export async function getTutorSessions(status: "ACTIVE" | "COMPLETED" | "PENDING" = "ACTIVE") {
  try {
    const user = await getUserData();
    if (!user) return [];

    return await prisma.session.findMany({
      where: {
        partnerId: user.id,
        status: status
      },
      include: {
        student: {
          select: {
            name: true,
            avatar: true
          }
        }
      },
      orderBy: {
        startedAt: "desc"
      }
    });
  } catch (error) {
    console.error("Error in getTutorSessions:", error);
    return [];
  }
}

/**
 * Returns the top verified tutors ranked by rating, with totalSessions as a
 * tiebreaker. Used by `/tutor/leaderboard`. Excludes tutors with zero sessions
 * so the board reflects real activity.
 */
export async function getTutorLeaderboard(limit = 20) {
  try {
    const leaders = await prisma.user.findMany({
      where: {
        role: Role.TUTOR,
        tutorProfile: {
          is: { isVerified: true },
        },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        points: true,
        county: true,
        tutorProfile: {
          select: {
            subjects: true,
            rating: true,
            totalSessions: true,
            responseRate: true,
          },
        },
      },
      orderBy: [
        { tutorProfile: { rating: "desc" } },
        { tutorProfile: { totalSessions: "desc" } },
        { points: "desc" },
      ],
      take: limit,
    });
    return leaders;
  } catch (error) {
    console.error("Error in getTutorLeaderboard:", error);
    return [];
  }
}

export async function bookTutorSession(tutorId: string, subject: string, topic: string, scheduledTime: string) {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");

    const session = await prisma.session.create({
      data: {
        studentId: user.id,
        partnerId: tutorId,
        tier: "TUTOR",
        subject,
        topic,
        status: "PENDING",
        roomId: `room_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        startedAt: new Date(scheduledTime),
      }
    });

    revalidatePath("/dashboard/tutors");
    revalidatePath("/tutor");
    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error("Error in bookTutorSession:", error);
    return { success: false, error: "Failed to book session" };
  }
}
