"use server";

import { cache } from "react";

import prisma from "@/lib/prisma";
import { getProfileStatus, type ProfileStatus } from "@/lib/profile-completion";
import { createClient } from "@/utils/supabase/server";

/**
 * Per-request cached completeness lookup for the signed-in user.
 *
 * Matches on id OR email because legacy rows can carry a different primary key
 * than the Supabase auth id, and every other sync path in the app heals that
 * mismatch the same way.
 */
export const getMyProfileStatus = cache(async (): Promise<ProfileStatus | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: user.id },
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
      include: { studentProfile: true, tutorProfile: true, tutorApplication: true },
    });

    if (!dbUser) {
      return getProfileStatus({
        name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null,
        role: "STUDENT",
      });
    }

    return getProfileStatus({
      name: dbUser.name,
      role: dbUser.role,
      educationLevel: dbUser.educationLevel,
      curriculum: dbUser.curriculum,
      formYear: dbUser.formYear,
      county: dbUser.county,
      studentProfile: dbUser.studentProfile,
      tutorProfile: dbUser.tutorProfile,
      tutorApplication: dbUser.tutorApplication,
    });
  } catch (error) {
    console.error(error, { action: "getMyProfileStatus" });
    return null;
  }
});
