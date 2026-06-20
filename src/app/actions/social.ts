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

  const { data: existing, error: lookupError } = await admin
    .from("connections")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .single();

  // PGRST116 = no rows found — expected when user hasn't followed yet.
  // Any other error is real and should propagate.
  if (lookupError && !lookupError.message.includes("PGRST116")) {
    throw lookupError;
  }

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

export async function getFollowingIds() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("connections")
    .select("following_id")
    .eq("follower_id", user.id);

  return (data || []).map((row: any) => row.following_id as string);
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
