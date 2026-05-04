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
  bio?: string;
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

  const { role, educationLevel, formYear, county, subjects, weakTopics, studyStyle, bio, verificationPath, hourlyRate } = data;

  // 1. Update Supabase Auth Metadata (for middleware)
  // Even if they apply as a tutor, we keep them as a student role in metadata
  // until an admin activates their tutor dashboard.
  await supabase.auth.updateUser({
    data: { 
      role: "STUDENT", 
      onboarding_completed: true,
      pending_tutor_application: role === "TUTOR"
    }
  });

  const isHS = educationLevel === "HIGH_SCHOOL";

  // 2. Upsert User in Prisma
  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      name: user.user_metadata.full_name || "New User",
      role: Role.STUDENT, // Everyone starts as a student
      educationLevel: isHS ? EduLevel.HIGH_SCHOOL : EduLevel.UNIVERSITY,
      formYear: parseInt(formYear),
      county,
      isUnder18: isHS,
      
      studentProfile: {
        upsert: {
          create: {
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
        }
      }
    },
    create: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata.full_name || "New User",
      role: Role.STUDENT,
      educationLevel: isHS ? EduLevel.HIGH_SCHOOL : EduLevel.UNIVERSITY,
      formYear: parseInt(formYear),
      county,
      tier: Tier.BRONZE,
      isUnder18: isHS,
      
      studentProfile: {
        create: {
          subjects: subjects || [],
          weakTopics: weakTopics || [],
          studyStyle: studyStyle || "solo",
          preferredTimes: {},
          goals: []
        }
      }
    }
  });

  // 3. If applying as TUTOR, create the application record
  if (role === "TUTOR") {
    await prisma.tutorApplication.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        subjects: subjects || [],
        path: verificationPath === "GRADES" ? VerifPath.GRADES : VerifPath.POINTS,
        notes: bio || "",
      },
      update: {
        subjects: subjects || [],
        path: verificationPath === "GRADES" ? VerifPath.GRADES : VerifPath.POINTS,
        notes: bio || "",
        status: "PENDING"
      }
    });

    // Notify Admins (find all admins or just create a generic admin notification)
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "NEW_TUTOR_APPLICATION",
          title: "New Tutor Application",
          body: `${user.user_metadata.full_name} has applied to be a tutor.`,
          actionUrl: "/admin/tutors"
        }
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin/tutors");

  // 4. Send Emails
  if (role === "TUTOR") {
    // Custom email for application received
    // await sendTutorApplicationEmail(user.email!, user.user_metadata.full_name || "Expert");
    await sendWelcomeEmail(user.email!, user.user_metadata.full_name || "Scholar");
  } else {
    await sendWelcomeEmail(user.email!, user.user_metadata.full_name || "Scholar");
  }

  return { success: true };
}
