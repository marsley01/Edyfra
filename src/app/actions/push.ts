"use server";

import { createClient } from "@/utils/supabase/server";

// sendNotificationPush lives in the non-"use server" module
// @/lib/notifications/server: exported from here it was browser-callable, so
// anyone could push arbitrary notifications to any user.

export async function getUserPushSubscriptions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint")
    .eq("user_id", user.id);

  return (subscriptions || []).map(s => s.endpoint);
}
