"use server";

// Client-callable entry points into the matching engine. The engine itself
// lives in ./match-engine.ts (not a server-action module) so its id-trusting
// internals can't be invoked directly from the browser.

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import {
  getFilteredMatchRequests as getFilteredMatchRequestsInternal,
  decrementTutorActiveSessions as decrementTutorActiveSessionsInternal,
} from "./match-engine";

/**
 * Fetch pending match requests filtered by tutor's subjects.
 * Restricted to tutors/admins — it exposes every open student request.
 */
export async function getFilteredMatchRequests(tutorSubjects: string[]) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: user.id },
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
      select: { role: true },
    });
    if (dbUser?.role !== "TUTOR" && dbUser?.role !== "ADMIN") return [];

    return await getFilteredMatchRequestsInternal(tutorSubjects);
  } catch (error) {
    console.error("Error fetching filtered match requests:", error);
    return [];
  }
}

/**
 * Update tutor load balancing counters after session ends.
 */
export async function decrementTutorActiveSessions(tutorId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await decrementTutorActiveSessionsInternal(tutorId);
}
