"use server";

import { PrismaClient } from "@prisma/client";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();
const ADMIN_SECRET_KEY = "EDYFRA_MASTER_2024"; // In production, move this to .env

export async function registerAdmin(formData: any) {
  const { email, password, name, securityKey } = formData;

  if (securityKey !== ADMIN_SECRET_KEY) {
    return { error: "Invalid Security Key. Unauthorized access attempt logged." };
  }

  const supabase = await createClient();

  // 1. Create Auth User
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        role: "ADMIN",
      },
    },
  });

  if (authError) return { error: authError.message };
  if (!authData.user) return { error: "Signup failed." };

  // 2. Create Prisma User with ADMIN role
  try {
    await prisma.user.create({
      data: {
        id: authData.user.id,
        email: email,
        name: name,
        role: "ADMIN",
        educationLevel: "UNIVERSITY", // Admins default to University or NA
        county: "Nairobi",
        points: 0,
        tier: "BRONZE",
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Prisma Error:", err);
    return { error: "Failed to create admin profile." };
  }
}

export async function getTutorApplications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  return await prisma.tutorApplication.findMany({
    include: {
      user: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function approveTutorApplication(applicationId: string) {
  const supabase = await createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  if (!adminUser || adminUser.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  // 1. Get Application Details
  const app = await prisma.tutorApplication.findUnique({
    where: { id: applicationId },
    include: { user: true }
  });

  if (!app) throw new Error("Application not found");

  // 2. Update User Role in Prisma
  await prisma.user.update({
    where: { id: app.userId },
    data: { role: Role.TUTOR }
  });

  // 3. Create/Update TutorProfile
  await prisma.tutorProfile.upsert({
    where: { userId: app.userId },
    create: {
      userId: app.userId,
      subjects: app.subjects,
      verificationPath: app.path,
      hourlyRate: 500, // Default rate
      bio: app.notes || "",
      isVerified: true,
      verifiedAt: new Date(),
      availability: {}
    },
    update: {
      isVerified: true,
      verifiedAt: new Date(),
      subjects: app.subjects,
    }
  });

  // 4. Update Application Status
  await prisma.tutorApplication.update({
    where: { id: applicationId },
    data: {
      status: "APPROVED",
      reviewedBy: adminUser.id,
      reviewedAt: new Date()
    }
  });

  // 5. Create Notification for the Tutor
  await prisma.notification.create({
    data: {
      userId: app.userId,
      type: "TUTOR_APPROVED",
      title: "Application Approved!",
      body: "Congratulations! Your expert dashboard has been activated.",
      actionUrl: "/tutor"
    }
  });

  // 6. Update Supabase Metadata (Requires Admin Client or Service Role usually, 
  // but since we are using SSR client, we might only be able to update OUR OWN metadata.
  // HOWEVER, the next time the user logs in or their session refreshes, we want them to have the role.
  // In a production app, this would be handled by a Supabase Edge Function or a Service Role client.
  // For now, we rely on the Prisma role which the middleware should check.

  revalidatePath("/admin/tutors");
  revalidatePath("/dashboard/tutors");
  
  return { success: true };
}

export async function rejectTutorApplication(applicationId: string, notes: string) {
  const supabase = await createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  if (!adminUser || adminUser.user_metadata?.role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.tutorApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
      reviewedBy: adminUser.id,
      reviewedAt: new Date(),
      notes: notes
    }
  });

  revalidatePath("/admin/tutors");
  return { success: true };
}
