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

  // Try uploading to storage using the user's authenticated session
  let { error: uploadError } = await supabaseClient.storage
    .from("resources")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    if (uploadError.message?.includes("bucket") || uploadError.message?.includes("not found")) {
      const adminClient = createAdminClient();
      const { error: bucketError } = await adminClient.storage.createBucket("resources", {
        public: true,
      });
      if (bucketError) {
        return { error: `Storage unavailable: ${bucketError.message}` };
      }
      const { error: retryError } = await supabaseClient.storage
        .from("resources")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (retryError) {
        return { error: retryError.message };
      }
    } else {
      return { error: uploadError.message };
    }
  }

  const { data: { publicUrl } } = supabaseClient.storage.from("resources").getPublicUrl(fileName);

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
    if (dbError?.code === "P2003") {
      return { error: "Account not fully set up. Visit your dashboard first." };
    }
    return { error: dbError?.message || "Failed to save resource" };
  }

  return { success: true };
}
