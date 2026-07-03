"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import prisma from "@/lib/prisma";

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
  await adminClient.storage.createBucket("kyc", { public: true }).catch(() => {});

  if (idPhoto) {
    const ext = idPhoto.name.split(".").pop();
    const path = `${user.id}/id-${Date.now()}.${ext}`;
    const { error } = await adminClient.storage.from("kyc").upload(path, idPhoto, { upsert: true });
    if (!error) {
      idPhotoUrl = adminClient.storage.from("kyc").getPublicUrl(path).data.publicUrl;
    }
  }

  if (selfie) {
    const ext = selfie.name.split(".").pop();
    const path = `${user.id}/selfie-${Date.now()}.${ext}`;
    const { error } = await adminClient.storage.from("kyc").upload(path, selfie, { upsert: true });
    if (!error) {
      selfieUrl = adminClient.storage.from("kyc").getPublicUrl(path).data.publicUrl;
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
    return { success: false, error: error.message };
  }
}
