// Server-only admin gate shared by admin server actions, pages and API routes.
// Intentionally NOT a "use server" module: nothing here should be callable
// from the client as a server action.
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { Role } from "@/generated/client";
import { isFounderEmail } from "@/utils/admin-guard";

export type AdminCaller = { id: string; email: string | null };

/**
 * Returns the authenticated caller when they are an admin, otherwise null.
 * Source of truth is the Prisma `User.role` (ADMIN or FOUNDER). Founder emails
 * configured via ADMIN_EMAIL_1/2 (server env) are also accepted. Supabase
 * user_metadata is never trusted here.
 */
export async function getAdminCaller(): Promise<AdminCaller | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const caller = { id: user.id, email: user.email ?? null };
    if (isFounderEmail(user.email)) return caller;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    if (dbUser?.role === Role.ADMIN || dbUser?.role === Role.FOUNDER) return caller;
    return null;
  } catch (error) {
    console.error("[getAdminCaller] Error:", error);
    return null;
  }
}

/** Throws when the caller is not an admin. */
export async function requireAdminCaller(): Promise<AdminCaller> {
  const caller = await getAdminCaller();
  if (!caller) throw new Error("Unauthorized: Admin access required");
  return caller;
}
