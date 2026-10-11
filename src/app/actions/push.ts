"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { resolvePrismaUserId } from "@/lib/notifications/server";

// sendNotificationPush lives in the non-"use server" module
// @/lib/notifications/server: exported from here it was browser-callable, so
// anyone could push arbitrary notifications to any user.

export async function getUserPushSubscriptions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const prismaId = (await resolvePrismaUserId(user.id)) ?? user.id;
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: prismaId },
    select: { endpoint: true },
  });
  return subscriptions.map((s) => s.endpoint);
}
