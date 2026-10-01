"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { VerifPath } from "@/generated/client";
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

    const application = await prisma.tutorApplication.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        subjects,
        idPhotoUrl,
        selfieUrl,
        path: "POINTS",
        status: "PENDING",
      },
      update: {
        subjects,
        idPhotoUrl,
        selfieUrl,
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

export async function saveTutorVerification(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "Unauthorized" };

  const existing = await prisma.tutorApplication.findUnique({
    where: { userId: user.id },
  });

  // An admin decision is final. Re-uploading documents must not drag an APPROVED
  // tutor back to PENDING, and a REJECTED tutor has to go through support.
  if (existing && existing.status === "APPROVED") {
    return { success: false as const, error: "Your verification has already been approved." };
  }

  // Reuse whatever is already on file so a tutor can add just the missing half.
  let idPhotoUrl = existing?.idPhotoUrl ?? null;
  let selfieUrl = existing?.selfieUrl ?? null;
  let gradesUrl = existing?.gradesUrl ?? null;

  try {
    const idPhoto = formData.get("idPhoto") as File | null;
    if (idPhoto && idPhoto.size > 0) {
      const v = validateUploadFile(idPhoto, KYC_VALIDATION_OPTIONS);
      if (!v.valid) return { success: false as const, error: `ID photo: ${v.error}` };
      const ext = sanitizeFileExtension(idPhoto.name);
      const path = `kyc/${user.id}/id-${Date.now()}.${ext}`;
      await uploadFileToBucket(STORAGE_BUCKETS.kyc, path, idPhoto, idPhoto.type);
      idPhotoUrl = path;
    }

    const selfie = formData.get("selfie") as File | null;
    if (selfie && selfie.size > 0) {
      const v = validateUploadFile(selfie, KYC_VALIDATION_OPTIONS);
      if (!v.valid) return { success: false as const, error: `Selfie: ${v.error}` };
      const ext = sanitizeFileExtension(selfie.name);
      const path = `kyc/${user.id}/selfie-${Date.now()}.${ext}`;
      await uploadFileToBucket(STORAGE_BUCKETS.kyc, path, selfie, selfie.type);
      selfieUrl = path;
    }

    const grades = formData.get("grades") as File | null;
    if (grades && grades.size > 0) {
      const v = validateUploadFile(grades, KYC_VALIDATION_OPTIONS);
      if (!v.valid) return { success: false as const, error: `Grades proof: ${v.error}` };
      const ext = sanitizeFileExtension(grades.name);
      const path = `kyc/${user.id}/grades-${Date.now()}.${ext}`;
      await uploadFileToBucket(STORAGE_BUCKETS.kyc, path, grades, grades.type);
      gradesUrl = path;
    }

    if (!idPhotoUrl || !selfieUrl) {
      return {
        success: false as const,
        error: "We need both an ID photo and a selfie before we can review you.",
      };
    }

    const subjectsRaw = formData.get("subjects");
    const subjects = subjectsRaw
      ? (JSON.parse(String(subjectsRaw)) as string[])
      : (existing?.subjects ?? []);

    // Upsert, not create: `TutorApplication.userId` is @unique, so a second
    // submission used to throw P2002 and surface as a generic failure.
    await prisma.tutorApplication.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        subjects,
        idPhotoUrl,
        selfieUrl,
        gradesUrl,
        path: VerifPath.POINTS,
        status: "PENDING",
      },
      update: {
        subjects,
        idPhotoUrl,
        selfieUrl,
        gradesUrl,
        // REJECTED tutors get to resubmit; APPROVED is blocked above.
        status: "PENDING",
      },
    });

    await prisma.tutorProfile.update({
      where: { userId: user.id },
      data: { idPhotoUrl, selfieUrl },
    }).catch(() => {
      // TutorProfile is created by updateUserRole; a missing row heals on the
      // next onboarding save, so this must not fail the submission.
    });

    try {
      await supabase.auth.updateUser({ data: { tutorApplicationStatus: "PENDING" } });
    } catch {
      // metadata sync is best-effort
    }

    return { success: true as const };
  } catch (error: any) {
    console.error("saveTutorVerification error:", error);
    return { success: false as const, error: "Could not save your documents. Please try again." };
  }
}

export async function getTutorVerification() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const application = await prisma.tutorApplication.findUnique({
    where: { userId: user.id },
    select: { status: true, idPhotoUrl: true, selfieUrl: true, gradesUrl: true, notes: true },
  });

  return {
    status: application?.status ?? null,
    hasIdPhoto: Boolean(application?.idPhotoUrl),
    hasSelfie: Boolean(application?.selfieUrl),
    hasGrades: Boolean(application?.gradesUrl),
    notes: application?.notes ?? null,
  };
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
