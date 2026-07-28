"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAdminApp } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";

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

  const fileExt = file.name.split(".").pop();
  const storagePath = `resources/${user.id}/${Date.now()}.${fileExt}`;

  try {
    const app = getAdminApp();
    const bucket = getStorage(app).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileRef = bucket.file(storagePath);
    
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type || "application/octet-stream",
        cacheControl: "public, max-age=3600",
      }
    });
  } catch (uploadError: any) {
    console.error("Firebase Storage upload error:", uploadError);
    return { error: uploadError.message || "Failed to upload file" };
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

  // New rows: generate a short-lived signed URL via Firebase.
  if (!filePath) return { error: "Resource file is missing. Contact the seller." };

  try {
    const app = getAdminApp();
    // Support either direct path if Firebase or "resources/" prefix for new files.
    // Legacy supabase files won't work easily here unless they were migrated.
    // If the path doesn't start with resources/, it might be a supabase path, but we'll try it anyway.
    const bucket = getStorage(app).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const fileRef = bucket.file(filePath);

    const [url] = await fileRef.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + DOWNLOAD_LINK_TTL_SECONDS * 1000,
      responseDisposition: `attachment; filename="${resource.title.replace(/[^a-zA-Z0-9-_\.]/g, '_')}.${filePath.split(".").pop() || "file"}"`,
    });

    if (!url) {
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
