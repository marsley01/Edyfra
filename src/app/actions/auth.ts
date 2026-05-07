"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUserData } from "./user";
import prisma from "@/lib/prisma";
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
  
  // Properly determine role - check both Prisma and Supabase metadata
  let role = "STUDENT";
  
  if (prismaUser?.role) {
    role = prismaUser.role;
  } else if (data.user?.user_metadata?.role) {
    role = data.user.user_metadata.role.toUpperCase();
    // Sync role to Prisma if not present
    if (prismaUser) {
      await prisma.user.update({
        where: { id: prismaUser.id },
        data: { role: role as any }
      });
    }
  }
  
  // Special check: if Supabase metadata says ADMIN but Prisma doesn't, sync it
  if (data.user?.user_metadata?.role?.toUpperCase() === "ADMIN" && prismaUser && prismaUser.role !== "ADMIN") {
    await prisma.user.update({
      where: { id: prismaUser.id },
      data: { role: "ADMIN" }
    });
    role = "ADMIN";
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
    },
  });

  if (error) {
    return { error: error.message };
  }

  // We don't sync to Prisma here because onboarding will handle it
  // But we ensure the user is redirected to onboarding
  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
