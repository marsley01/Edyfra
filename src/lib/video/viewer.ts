/**
 * Server-side resolution of the signed-in user's Stream identity.
 *
 * Stream (chat and video share one user table) is keyed by the PRISMA user
 * id. For some older/OAuth accounts that id differs from the Supabase auth id,
 * so we match on id OR email. When no Prisma row exists yet (brand-new
 * account not mirrored), we fall back to the auth id, matching
 * getCanonicalUserProfile in src/lib/user-sync.ts.
 *
 * Not a "use server" module: nothing here is meant to be browser-callable.
 */
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export interface StreamViewer {
  authId: string;
  /** Prisma user id (== Stream user id). */
  id: string;
  name: string;
  image: string | null;
  role: string | null;
}

export async function resolveStreamViewer(): Promise<StreamViewer | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const select = { id: true, name: true, avatar: true, role: true } as const;
  // Exact id match wins; otherwise the legacy row with the same email
  const dbUser =
    (await prisma.user.findUnique({ where: { id: user.id }, select })) ??
    (user.email
      ? await prisma.user.findFirst({ where: { email: user.email }, select })
      : null);

  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const metaName =
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    "";

  return {
    authId: user.id,
    id: dbUser?.id ?? user.id,
    name: dbUser?.name || metaName || user.email?.split("@")[0] || "Edyfra User",
    image: dbUser?.avatar ?? ((typeof meta.avatar === "string" && meta.avatar) || null),
    role: dbUser?.role ?? null,
  };
}
