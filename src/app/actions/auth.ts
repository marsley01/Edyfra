"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUserData } from "./user";
import { isFounderEmail } from "@/utils/admin-guard";
export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // FORCE SYNC: Ensure Prisma has this user record immediately on login
  const prismaUser = await getUserData();
  
  // Prisma is the source of truth for role.
  // Fallback: check founder email when DB is unreachable so admin can still log in.
  const role = prismaUser?.role || (isFounderEmail(email) ? "ADMIN" : "STUDENT");
  
  // Keep Supabase metadata aligned with Prisma so middleware/layout routing doesn't mis-route users.
  try {
    const currentMetaRole = (data.user?.user_metadata?.role || "").toUpperCase();
    const desiredRole = (role || "STUDENT").toUpperCase();
    if (currentMetaRole !== desiredRole) {
      await supabase.auth.updateUser({ data: { role: desiredRole } });
    }
  } catch (e) {
    console.error("Role metadata sync failed:", e);
  }

  revalidatePath("/", "layout");
  
  if (role === "TUTOR") {
    redirect("/tutor");
  } else if (role === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/dashboard");
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name,
        role: "STUDENT", // Default role
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { success: true, message: "Account created! Check your email to confirm before continuing." };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
