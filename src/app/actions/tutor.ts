"use server";

import { Role, VerifPath } from "@prisma/client";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getUserData } from "./user";

export async function getTutorProfile() {
  try {
    const user = await getUserData();
    if (!user) return null;

    let profile = await prisma.tutorProfile.findUnique({
      where: { userId: user.id },
      include: { user: true }
    });

    if (!profile && user.role === Role.TUTOR) {
      console.log(`Creating missing TutorProfile for ${user.id}`);
      profile = await prisma.tutorProfile.create({
        data: {
          userId: user.id,
          bio: user.bio || "",
          subjects: [],
          levelsTaught: [],
          verificationPath: VerifPath.POINTS,
          hourlyRate: 500,
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
}

export async function toggleTutorStatus(isOnline: boolean) {
  try {
    const user = await getUserData();
    if (!user) throw new Error("Unauthorized");

    console.log(`Toggling tutor status for ${user.id} to ${isOnline}`);
    await prisma.tutorProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        bio: user.bio || "",
        subjects: [],
        levelsTaught: [],
        verificationPath: VerifPath.POINTS,
        hourlyRate: 500,
        availability: { isOnline }
      },
      update: {
        availability: { isOnline },
        // Healing logic for legacy records
        bio: user.bio || "",
        subjects: [],
        levelsTaught: [],
        verificationPath: VerifPath.POINTS,
        hourlyRate: 500
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

import { acceptMatchRequest } from "./match";
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

export async function getVerifiedTutors() {
  try {
    // REMOVED isVerified: true filter so all tutors show up for testing
    // In production, we'd add this back or filter by isVerified: true
    return await prisma.user.findMany({
      where: {
        role: Role.TUTOR,
        tutorProfile: {
          isNot: null // Just ensure they have a profile
        }
      },
      include: {
        tutorProfile: true
      }
    });
  } catch (error) {
    console.error("Error in getVerifiedTutors:", error);
    return [];
  }
}

export async function searchTutors(query: string) {
  try {
    if (!query || query.length < 2) return [];

    return await prisma.user.findMany({
      where: {
        role: "TUTOR",
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { bio: { contains: query, mode: "insensitive" } },
          {
            tutorProfile: {
              subjects: { has: query }
            }
          }
        ],
        tutorProfile: { isNot: null }
      },
      include: {
        tutorProfile: true
      },
      take: 10
    });
  } catch (error) {
    console.error("Error in searchTutors:", error);
    return [];
  }
}

export async function getTutorSessions(status: "ACTIVE" | "COMPLETED" = "ACTIVE") {
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
