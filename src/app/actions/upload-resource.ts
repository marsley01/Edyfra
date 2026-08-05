"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { STORAGE_BUCKETS, uploadFileToBucket } from "@/lib/supabase-storage";

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

  // Validate file type and size
  const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
  const maxSize = 20 * 1024 * 1024; // 20MB

  if (!allowedTypes.includes(file.type)) {
    return { error: "Invalid file type. Allowed: PDF, images, Word documents, PowerPoint presentations." };
  }
  if (file.size > maxSize) {
    return { error: "File too large. Maximum size is 20MB." };
  }

  // Ensure the Prisma User record exists (foreign key requirement)
  const existingUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!existingUser) {
    return { error: "Please visit your dashboard first to activate your account before uploading." };
  }

  const supabaseClient = await createClient();
  const fileExt = file.name.split(".").pop();
  const sanitizedExt = fileExt?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  const fileName = `${user.id}/${Date.now()}.${sanitizedExt}`;

  // Try uploading to Supabase Storage
  let storagePath = "";
  try {
    storagePath = `resources/${fileName}`;
    await uploadFileToBucket(STORAGE_BUCKETS.resources, storagePath, file, file.type);
  } catch (uploadError: any) {
    console.error("Supabase Storage upload error:", uploadError);
    return { error: uploadError.message || "Failed to upload file" };
  }

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
        filePath: storagePath,
        status: "pending",
      },
    });
  } catch (dbError: any) {
    console.error("upload-resource prisma error:", dbError);
    if (dbError?.code === "P2003") {
      return { error: "Account not fully set up. Visit your dashboard first." };
    }
    return { error: dbError?.message || "Failed to save resource" };
  }

  return { success: true };
}
