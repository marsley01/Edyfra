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
