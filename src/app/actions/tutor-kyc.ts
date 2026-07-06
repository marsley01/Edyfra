"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import prisma from "@/lib/prisma";

export async function uploadKycFile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" as const };

  const adminClient = createAdminClient();
  const file = formData.get("file") as File | null;
  const prefix = formData.get("prefix") as string;

  if (!file) return { success: false, error: "No file provided" as const };

  const ext = file.name.split(".").pop();
  const path = `${user.id}/onboarding-${prefix}-${Date.now()}.${ext}`;

  await adminClient.storage.createBucket("kyc", { public: false }).catch(() => {});
  const { error: uploadError } = await adminClient.storage.from("kyc").upload(path, file, { upsert: true });
  if (uploadError) {
    console.error("KYC upload error:", uploadError);
    return { success: false, error: uploadError.message };
  }

  const { data: signed } = await adminClient.storage.from("kyc").createSignedUrl(path, 60 * 60 * 24 * 365);
  return { success: true as const, url: signed?.signedUrl || null };
}

export async function submitTutorApplication(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const adminClient = createAdminClient();

  const idPhoto = formData.get("idPhoto") as File | null;
  const selfie = formData.get("selfie") as File | null;
  const subjectsStr = formData.get("subjects") as string;
  const subjects = subjectsStr ? JSON.parse(subjectsStr) : [];

  let idPhotoUrl = null;
  let selfieUrl = null;

  // Ensure 'kyc' bucket exists
  await adminClient.storage.createBucket("kyc", { public: false }).catch(() => {});

  if (idPhoto) {
    const ext = idPhoto.name.split(".").pop();
    const path = `${user.id}/id-${Date.now()}.${ext}`;
    const { error } = await adminClient.storage.from("kyc").upload(path, idPhoto, { upsert: true });
    if (!error) {
      const { data: signedPhoto } = await adminClient.storage.from("kyc").createSignedUrl(path, 60 * 60 * 24 * 365);
      idPhotoUrl = signedPhoto?.signedUrl || null;
    }
  }

  if (selfie) {
    const ext = selfie.name.split(".").pop();
    const path = `${user.id}/selfie-${Date.now()}.${ext}`;
    const { error } = await adminClient.storage.from("kyc").upload(path, selfie, { upsert: true });
    if (!error) {
      const { data: signedSelfie } = await adminClient.storage.from("kyc").createSignedUrl(path, 60 * 60 * 24 * 365);
      selfieUrl = signedSelfie?.signedUrl || null;
    }
  }

  try {
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
    console.error("Tutor KYC error:", error);
    return { success: false, error: "Failed to submit tutor application" };
  }
}
