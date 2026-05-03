"use server";

import { PrismaClient, Role, EduLevel, Tier, VerifPath } from "@prisma/client";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendWelcomeEmail, sendTutorWelcomeEmail } from "@/lib/email";

const prisma = new PrismaClient();

interface OnboardingData {
  role: string;
  educationLevel: string;
  formYear: string;
  county: string;
  subjects: string[];
  weakTopics: string[];
  studyStyle: string;
  verificationPath?: string;
  hourlyRate?: string;
}

export async function completeOnboarding(data: OnboardingData) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { role, educationLevel, formYear, county, subjects, weakTopics, studyStyle, verificationPath, hourlyRate } = data;

  // 1. Update Supabase Auth Metadata (for middleware)
  await supabase.auth.updateUser({
    data: { 
      role: role,
      onboarding_completed: true 
    }
  });

  const isHS = educationLevel === "HIGH_SCHOOL";

  // 2. Create User in Prisma
  await prisma.user.create({
    data: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata.full_name || "New User",
      role: role === "TUTOR" ? Role.TUTOR : Role.STUDENT,
      educationLevel: isHS ? EduLevel.HIGH_SCHOOL : EduLevel.UNIVERSITY,
      formYear: parseInt(formYear),
      county,
      tier: Tier.BRONZE,
      isUnder18: isHS,
      
      ...(role === "STUDENT" ? {
        studentProfile: {
          create: {
            subjects: subjects || [],
            weakTopics: weakTopics || [],
            studyStyle: studyStyle || "solo",
            preferredTimes: {},
            goals: []
          }
        }
      } : {
        tutorProfile: {
          create: {
            subjects: subjects || [],
            levelsTaught: [],
            verificationPath: verificationPath === "GRADES" ? VerifPath.GRADES : VerifPath.POINTS,
            hourlyRate: parseInt(hourlyRate!) || 0,
            bio: "",
            availability: {}
          }
        }
      })
    }
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/tutor");

  // 3. Send Professional Welcome Email
  if (role === "TUTOR") {
    await sendTutorWelcomeEmail(user.email!, user.user_metadata.full_name || "Expert");
  } else {
    await sendWelcomeEmail(user.email!, user.user_metadata.full_name || "Scholar");
  }

  return { success: true };
}
