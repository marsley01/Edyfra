"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { STORAGE_BUCKETS, createSignedUrl, isHttpUrl, uploadFileToBucket } from "@/lib/supabase-storage";

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
    await uploadFileToBucket(STORAGE_BUCKETS.kyc, path, file, file.type);
    const url = await createSignedUrl(STORAGE_BUCKETS.kyc, path, 60 * 60 * 24 * 30);
    return { success: true as const, url, path };
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
    if (idPhoto) {
      const ext = idPhoto.name.split(".").pop();
      const path = `kyc/${user.id}/id-${Date.now()}.${ext}`;
      await uploadFileToBucket(STORAGE_BUCKETS.kyc, path, idPhoto, idPhoto.type);
      idPhotoUrl = path;
    }

    if (selfie) {
      const ext = selfie.name.split(".").pop();
      const path = `kyc/${user.id}/selfie-${Date.now()}.${ext}`;
      await uploadFileToBucket(STORAGE_BUCKETS.kyc, path, selfie, selfie.type);
      selfieUrl = path;
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

export async function resolveKycUrl(urlOrPath: string | null | undefined): Promise<string | null> {
  if (!urlOrPath) return null;
  if (isHttpUrl(urlOrPath)) return urlOrPath;
  try {
    return await createSignedUrl(STORAGE_BUCKETS.kyc, urlOrPath, 60 * 60);
  } catch {
    return null;
  }
}
