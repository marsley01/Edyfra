"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import prisma from "@/lib/prisma";

export async function uploadResource(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to upload resources." };
  }

  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const subject = formData.get("subject") as string;
  const education_level = formData.get("education_level") as string;
  const resource_type = formData.get("resource_type") as string;
  const topic = formData.get("topic") as string;
  const description = formData.get("description") as string;
  const price = Number(formData.get("price"));

  if (!file || !title || !subject || !education_level || !resource_type) {
    return { error: "Missing required fields" };
  }

  const adminClient = createAdminClient();
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await adminClient.storage
    .from("resources")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    console.error("upload-resource storage error:", uploadError);
    return { error: uploadError.message };
  }

  const { data: { publicUrl } } = adminClient.storage.from("resources").getPublicUrl(fileName);

  try {
    await prisma.resource.create({
      data: {
        sellerId: user.id,
        title,
        subject,
        educationLevel: education_level,
        resourceType: resource_type || null,
        topic: topic || null,
        description: description || null,
        price,
        filePath: publicUrl,
        status: "pending",
      },
    });
  } catch (dbError: any) {
    console.error("upload-resource prisma error:", dbError);
    return { error: dbError?.message || "Failed to save resource" };
  }

  return { success: true };
}
