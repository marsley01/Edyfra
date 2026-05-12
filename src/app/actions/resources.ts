"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/utils/supabase/admin";

export async function uploadAndCreateResource(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to upload resources." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (dbUser?.role !== "TUTOR" && dbUser?.role !== "ADMIN") {
    return { error: "Only verified tutors can sell resources. Apply to become a tutor first." };
  }

  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const subject = formData.get("subject") as string;
  const education_level = formData.get("education_level") as string;
  const resource_type = formData.get("resource_type") as string;
  const topic = formData.get("topic") as string;
  const description = formData.get("description") as string;
  const price = Number(formData.get("price"));

  if (!file || !title || !subject) {
    return { error: "Missing required fields" };
  }

  const adminClient = createAdminClient();
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;
  
  const { error: uploadError } = await adminClient.storage
    .from("resources")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return { error: uploadError.message };
  }

  const { data: { publicUrl } } = adminClient.storage.from("resources").getPublicUrl(fileName);

  const { error } = await adminClient.from("resources").insert({
    seller_id: user.id,
    title,
    subject,
    education_level,
    resource_type,
    topic: topic || null,
    description: description || null,
    price,
    file_path: publicUrl,
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
