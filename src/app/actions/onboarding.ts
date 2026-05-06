"use server";

import { Role, EduLevel, Tier, VerifPath } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { sendWelcomeEmail } from "@/lib/email";
import { TUTOR_CONFIG } from "@/lib/config";

interface OnboardingData {
  role: string;
  educationLevel: string;
  curriculum?: string;
  formYear: string;
  county: string;
  subjects: string[];
  weakTopics: string[];
  studyStyle: string;
  bio?: string;
  verificationPath?: string;
  hourlyRate?: string;
  mpesaNumber?: string;
}

export async function completeOnboarding(data: OnboardingData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { 
    role, educationLevel, curriculum, formYear, 
    county, subjects, weakTopics, studyStyle, 
    bio, verificationPath, hourlyRate, mpesaNumber 
  } = data;
  
  const isTutor = role === "TUTOR";
  
  let userEducationLevel: EduLevel | null = null;
  if (educationLevel === EduLevel.HIGH_SCHOOL) {
    userEducationLevel = EduLevel.HIGH_SCHOOL;
  } else if (educationLevel === EduLevel.UNIVERSITY) {
    userEducationLevel = EduLevel.UNIVERSITY;
  } else if (!isTutor) { // For students, ensure a default if not explicitly set
    userEducationLevel = EduLevel.HIGH_SCHOOL;
  }

  const prismaRole = isTutor ? Role.TUTOR : Role.STUDENT;

  // 1. Update Supabase Auth Metadata
  await supabase.auth.updateUser({
    data: { 
      role: isTutor ? "TUTOR" : "STUDENT", 
      onboarding_completed: true,
    }
  });

  // 2. EXPLICIT SYNC WITH HEALING (ID or Email)
  // We prioritize the Supabase ID to ensure foreign key integrity
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        { email: user.email! }
      ]
    }
  });

  const baseData = {
    email: user.email!,
    name: user.user_metadata.name || user.user_metadata.full_name || "New User",
    role: prismaRole,
    educationLevel: userEducationLevel,
    curriculum: userEducationLevel === EduLevel.HIGH_SCHOOL ? (curriculum || "8-4-4") : "HEC",
    formYear: parseInt(formYear) || null,
    county: county || "Nairobi",
    isUnder18: userEducationLevel === EduLevel.HIGH_SCHOOL,
    bio: bio || "",
  };

  let finalUserId = user.id;

  if (existingUser) {
    // If the user exists with a different ID (legacy/email mismatch), 
    // we must ensure the profile uses the EXISTING ID to avoid FK errors,
    // OR we update the existing record to have the new Supabase ID if safe.
    // Given Prisma's @id is usually @default(uuid()), we use the record's primary ID.
    finalUserId = existingUser.id;
    await prisma.user.update({
      where: { id: existingUser.id },
      data: baseData
    });
  } else {
    const newUser = await prisma.user.create({
      data: {
        ...baseData,
        id: user.id,
        tier: Tier.BRONZE,
      }
    });
    finalUserId = newUser.id;
  }

  // 3. Create Student Profile
  await prisma.studentProfile.upsert({
    where: { userId: finalUserId },
    create: {
      userId: finalUserId,
      subjects: subjects || [],
      weakTopics: weakTopics || [],
      studyStyle: studyStyle || "solo",
      preferredTimes: {},
      goals: []
    },
    update: {
      subjects: subjects || [],
      weakTopics: weakTopics || [],
      studyStyle: studyStyle || "solo",
    }
  });

  // 4. If TUTOR, Create Tutor Profile
  if (isTutor) {
    await prisma.tutorProfile.upsert({
      where: { userId: finalUserId },
      create: {
        userId: finalUserId,
        subjects: subjects || [], // Tutor subjects
        levelsTaught: userEducationLevel ? [userEducationLevel] : [], // Only add if not null
        verificationPath: verificationPath === "GRADES" ? VerifPath.GRADES : VerifPath.POINTS,
        hourlyRate: parseInt(hourlyRate || TUTOR_CONFIG.DEFAULT_HOURLY_RATE_KSH.toString()),
        bio: bio || TUTOR_CONFIG.DEFAULT_BIO,
        mpesaNumber: mpesaNumber || "",
        isVerified: true,
        availability: { isOnline: false }
      },
      update: {
        subjects: subjects || [],
        bio: bio || TUTOR_CONFIG.DEFAULT_BIO,
        hourlyRate: parseInt(hourlyRate || TUTOR_CONFIG.DEFAULT_HOURLY_RATE_KSH.toString()),
        mpesaNumber: mpesaNumber || "",
        isVerified: true
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/tutor");

  // 5. Send Welcome Email
  try {
    await sendWelcomeEmail(user.email!, user.user_metadata?.name || "Scholar");
  } catch (e) {
    console.error("Welcome email failed:", e);
  }

  return { success: true };
  } catch (error: any) {
    console.error("Onboarding failed:", error);
    return { success: false, error: error.message || "Internal server error" };
  }
}
