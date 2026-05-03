"use server";

import { PrismaClient } from "@prisma/client";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function updateProfile(data: { name?: string; bio?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      bio: data.bio,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true, user: updatedUser };
}

export async function updateUserSettings(settings: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      settings: settings,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true, user: updatedUser };
}

export async function getUserData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  return await prisma.user.findUnique({
    where: { id: user.id },
  });
}
