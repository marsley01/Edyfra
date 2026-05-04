"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleFollow(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required");

  // Check if already following
  const { data: existing } = await supabase
    .from("connections")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .single();

  if (existing) {
    // Unfollow
    await supabase
      .from("connections")
      .delete()
      .eq("id", existing.id);
  } else {
    // Follow
    await supabase
      .from("connections")
      .insert({
        follower_id: user.id,
        following_id: targetUserId,
      });
    
    // Create notification
    await supabase.from("Notification").insert({
      userId: targetUserId,
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

  await supabase.from("profile_views").insert({
    viewer_id: user?.id || null,
    profile_id: profileId,
  });
}
