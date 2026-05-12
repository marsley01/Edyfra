"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Server action to create a resource listing.
 * Using server-side Supabase + Prisma bypasses client-side RLS issues.
 */
export async function createResource(data: {
  title: string;
  subject: string;
  education_level: string;
  resource_type: string;
  topic?: string;
  description?: string;
  price: number;
  file_path: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to upload resources." };
  }

  // Verify the user is a tutor via Prisma (source of truth)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (dbUser?.role !== "TUTOR" && dbUser?.role !== "ADMIN") {
    return { error: "Only verified tutors can sell resources. Apply to become a tutor first." };
  }

  const { error } = await supabase.from("resources").insert({
    seller_id: user.id,
    title: data.title,
    subject: data.subject,
    education_level: data.education_level,
    resource_type: data.resource_type,
    topic: data.topic || null,
    description: data.description || null,
    price: data.price,
    file_path: data.file_path,
    status: "pending",
  });

  if (error) {
    console.error("Resource insert error:", error);
    return { error: error.message };
  }

  revalidatePath("/tutor/resources");
  return { success: true };
}

/**
 * Fetch resources uploaded by the current tutor
 */
export async function getMyResources() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}
