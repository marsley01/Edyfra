"use server";

import { PrismaClient, Role } from "@prisma/client";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { sendTutorWelcomeEmail } from "@/lib/email";

const prisma = new PrismaClient();

export async function getUserData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      studentProfile: true,
      tutorProfile: true
    }
  });
}

export async function updateUserRole(role: "STUDENT" | "TUTOR") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Unauthorized");

  // Update Supabase Metadata
  await supabase.auth.updateUser({
    data: { role: role }
  });

  // Ensure User exists in Prisma with this role
  // We use upsert to handle cases where the user record might or might not exist
  await prisma.user.upsert({
    where: { id: user.id },
    update: { role: role === "TUTOR" ? Role.TUTOR : Role.STUDENT },
    create: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata.full_name || "New User",
      role: role === "TUTOR" ? Role.TUTOR : Role.STUDENT,
      educationLevel: "HIGH_SCHOOL", // Default placeholder
      county: "Nairobi", // Default placeholder
    }
  });

  revalidatePath("/");
  revalidatePath("/onboarding");
  return { success: true };
}

export async function updateProfile(data: { name: string; bio: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      bio: data.bio,
    }
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateUserSettings(settings: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id: user.id },
    data: { settings }
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}
