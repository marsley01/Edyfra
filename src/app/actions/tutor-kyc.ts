"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { STORAGE_BUCKETS, createSignedUrl, isHttpUrl, uploadFileToBucket, validateUploadFile, sanitizeFileExtension, sanitizeFileName } from "@/lib/supabase-storage";

const KYC_VALIDATION_OPTIONS = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ["jpg", "jpeg", "png", "webp", "pdf"],
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
};

export async function uploadKycFile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" as const };

  const file = formData.get("file") as File | null;
  const prefixRaw = (formData.get("prefix") as string) || "doc";
  const prefix = sanitizeFileName(prefixRaw);

  if (!file) return { success: false, error: "No file provided" as const };

  const validation = validateUploadFile(file, KYC_VALIDATION_OPTIONS);
  if (!validation.valid) {
    return { success: false, error: validation.error || "Invalid file" };
  }

  const ext = sanitizeFileExtension(file.name);
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
      const v = validateUploadFile(idPhoto, KYC_VALIDATION_OPTIONS);
      if (!v.valid) return { success: false, error: `ID Photo error: ${v.error}` };
      const ext = sanitizeFileExtension(idPhoto.name);
      const path = `kyc/${user.id}/id-${Date.now()}.${ext}`;
      await uploadFileToBucket(STORAGE_BUCKETS.kyc, path, idPhoto, idPhoto.type);
      idPhotoUrl = path;
    }

    if (selfie) {
      const v = validateUploadFile(selfie, KYC_VALIDATION_OPTIONS);
      if (!v.valid) return { success: false, error: `Selfie error: ${v.error}` };
      const ext = sanitizeFileExtension(selfie.name);
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
