"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { STORAGE_BUCKETS, uploadFileToBucket, validateUploadFile, sanitizeFileExtension } from "@/lib/supabase-storage";

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
  const validation = validateUploadFile(file, {
    maxSizeBytes: 50 * 1024 * 1024,
    allowedExtensions: ["pdf", "doc", "docx", "ppt", "pptx", "png", "jpg", "jpeg", "webp"],
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  });

  if (!validation.valid) {
    return { error: validation.error || "Invalid file." };
  }

  // Ensure the Prisma User record exists (foreign key requirement)
  const existingUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!existingUser) {
    return { error: "Please visit your dashboard first to activate your account before uploading." };
  }

  const sanitizedExt = sanitizeFileExtension(file.name);
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
