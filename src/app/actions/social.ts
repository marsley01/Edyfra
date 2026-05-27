"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import prisma from "@/lib/prisma";
import { notifyUser } from "@/app/actions/notifications";
import { revalidatePath } from "next/cache";

export async function toggleFollow(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required");

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("connections")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .single();

  if (existing) {
    await admin.from("connections").delete().eq("id", existing.id);
  } else {
    await admin.from("connections").insert({
      follower_id: user.id,
      following_id: targetUserId,
    });

    await notifyUser(targetUserId, {
      type: "FOLLOW",
      title: "New Follower",
      body: "Someone just started following your academic journey.",
    });
  }

  revalidatePath("/dashboard");
}

export async function trackProfileView(profileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  await admin.from("profile_views").insert({
    viewer_id: user?.id || null,
    profile_id: profileId,
  });
}
