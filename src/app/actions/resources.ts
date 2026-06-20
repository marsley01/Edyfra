"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/utils/supabase/admin";

const DOWNLOAD_LINK_TTL_SECONDS = 60 * 5; // 5 minutes

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
  const storagePath = `${user.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await adminClient.storage
    .from("resources")
    .upload(storagePath, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return { error: uploadError.message };
  }

  // Store the storage path (NOT the public URL) so we can issue
  // short-lived signed URLs on demand. Existing rows that already have
  // a public URL are handled by getResourceDownloadUrl below.
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
    console.error("Resource Prisma insert error:", dbError);
    return { error: dbError?.message || "Failed to save resource" };
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

  try {
    return await prisma.resource.findMany({
      where: { sellerId: user.id },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

/**
 * Issue a short-lived signed URL for downloading a resource the user is
 * entitled to (owner, or has a purchase record, or it's free).
 * Also increments the downloads counter atomically.
 *
 * Returns { url } on success, or { error } on failure.
 */
export async function getResourceDownloadUrl(
  resourceId: string,
): Promise<{ url?: string; filename?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in to download resources." };

  let resource;
  try {
    resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        purchases: { where: { userId: user.id }, take: 1 },
      },
    });
  } catch (err) {
    console.error("[getResourceDownloadUrl] prisma error:", err);
    return { error: "Could not load resource. Please try again." };
  }

  if (!resource) return { error: "Resource not found." };
  if (resource.status !== "approved") {
    return { error: "This resource is not available for download." };
  }

  const isOwner = resource.sellerId === user.id;
  const isPaid = Number(resource.price) > 0;
  const hasPurchased = resource.purchases.length > 0;
  const isAdmin = await isUserAdmin(user.id);

  if (isPaid && !isOwner && !hasPurchased && !isAdmin) {
    return { error: "You must purchase this resource before downloading." };
  }

  const adminClient = createAdminClient();
  const filePath = resource.filePath || "";

  // Legacy rows store a public URL — open it directly.
  if (/^https?:\/\//i.test(filePath)) {
    try {
      await prisma.resource.update({
        where: { id: resourceId },
        data: { downloads: { increment: 1 } },
      });
    } catch (err) {
      console.warn("[getResourceDownloadUrl] counter increment failed:", err);
    }
    return { url: filePath, filename: resource.title };
  }

  // New rows: generate a short-lived signed URL.
  if (!filePath) return { error: "Resource file is missing. Contact the seller." };

  try {
    const { data, error } = await adminClient.storage
      .from("resources")
      .createSignedUrl(filePath, DOWNLOAD_LINK_TTL_SECONDS, {
        download: `${resource.title}.${filePath.split(".").pop() || "file"}`,
      });

    if (error || !data?.signedUrl) {
      console.error("[getResourceDownloadUrl] signed URL error:", error);
      return { error: "Could not generate download link. Please try again." };
    }

    try {
      await prisma.resource.update({
        where: { id: resourceId },
        data: { downloads: { increment: 1 } },
      });
    } catch (err) {
      console.warn("[getResourceDownloadUrl] counter increment failed:", err);
    }

    return { url: data.signedUrl, filename: resource.title };
  } catch (err: any) {
    console.error("[getResourceDownloadUrl] unexpected:", err);
    return { error: err?.message || "Unexpected error generating download link." };
  }
}

async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return u?.role === "ADMIN";
  } catch {
    return false;
  }
}
