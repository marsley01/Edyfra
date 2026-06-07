"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function institutionLogin(formData: FormData) {
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

  // Check if user is institution staff
  const staff = await prisma.institutionStaff.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!staff) {
    await supabase.auth.signOut();
    return { error: "You are not an authorized institution staff member." };
  }

  revalidatePath("/", "layout");
  // Return the target so the client form can navigate. Using `redirect()` here
  // would throw NEXT_REDIRECT inside the client's try/catch and get swallowed
  // as an error.
  return { redirectTo: "/institution/dashboard" };
}
