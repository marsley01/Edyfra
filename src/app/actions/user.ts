"use server";

import { PrismaClient, Role } from "@prisma/client";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

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
