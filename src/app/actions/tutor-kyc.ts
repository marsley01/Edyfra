"use server";

import { createClient } from "@/utils/supabase/server";
import { getAdminApp } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";
import prisma from "@/lib/prisma";

export async function uploadKycFile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" as const };

  const file = formData.get("file") as File | null;
  const prefix = formData.get("prefix") as string;

  if (!file) return { success: false, error: "No file provided" as const };

  const ext = file.name.split(".").pop();
  const path = `kyc/${user.id}/onboarding-${prefix}-${Date.now()}.${ext}`;

  try {
    const app = getAdminApp();
    const bucket = getStorage(app).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const fileRef = bucket.file(path);
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type || "application/octet-stream",
        cacheControl: "private, max-age=31536000",
      }
    });

    const [url] = await fileRef.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365, // 1 year
    });

    return { success: true as const, url };
  } catch (uploadError: any) {
    console.error("KYC upload error:", uploadError);
    return { success: false, error: uploadError.message };
  }
}

export async function submitTutorApplication(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const idPhoto = formData.get("idPhoto") as File | null;
  const selfie = formData.get("selfie") as File | null;
  const subjectsStr = formData.get("subjects") as string;
  const subjects = subjectsStr ? JSON.parse(subjectsStr) : [];

  let idPhotoUrl = null;
  let selfieUrl = null;

  try {
    const app = getAdminApp();
    const bucket = getStorage(app).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

    if (idPhoto) {
      const ext = idPhoto.name.split(".").pop();
      const path = `kyc/${user.id}/id-${Date.now()}.${ext}`;
      const arrayBuffer = await idPhoto.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileRef = bucket.file(path);
      
      await fileRef.save(buffer, {
        metadata: { contentType: idPhoto.type || "application/octet-stream" }
      });
      const [url] = await fileRef.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
      });
      idPhotoUrl = url;
    }

    if (selfie) {
      const ext = selfie.name.split(".").pop();
      const path = `kyc/${user.id}/selfie-${Date.now()}.${ext}`;
      const arrayBuffer = await selfie.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileRef = bucket.file(path);
      
      await fileRef.save(buffer, {
        metadata: { contentType: selfie.type || "application/octet-stream" }
      });
      const [url] = await fileRef.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
      });
      selfieUrl = url;
    }

    const application = await prisma.tutorApplication.create({
      data: {
        userId: user.id,
        subjects,
        idPhotoUrl,
        selfieUrl,
        path: "POINTS",
        status: "PENDING",
      },
    });

    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { tutorApplicationStatus: "PENDING" },
    });

    return { success: true, application };
  } catch (error: any) {
    console.error("Tutor KYC error:", error);
    return { success: false, error: "Failed to submit tutor application" };
  }
}
