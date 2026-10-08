// Server-only institution tenancy helpers shared by institution server actions.
// Intentionally NOT a "use server" module: nothing here should be callable
// from the client as a server action (see _admin-guard.ts for the same pattern).
import prisma from "@/lib/prisma";
import { getActiveInstitutionMembership } from "./institution-guard";

const ADMIN_ROLES = ["INSTITUTION_ADMIN", "INSTITUTION_DEPUTY"];

/**
 * Throws unless the signed-in caller is an ACTIVE admin/deputy of the given
 * institution (resolved from the database, never from client input). Every
 * exported read action that takes an `institutionId` argument must call this,
 * because exported server actions are reachable by direct POST.
 */
export async function assertInstitutionAdminAccess(institutionId: string) {
  const membership = await getActiveInstitutionMembership();
  if (
    !membership ||
    membership.institution.id !== institutionId ||
    !ADMIN_ROLES.includes(membership.role)
  ) {
    throw new Error("Forbidden: not an admin of this institution");
  }
  return membership;
}

export async function logInstitutionActivity(
  institutionId: string,
  data: {
    type: Parameters<typeof prisma.institutionActivity.create>[0]["data"]["type"];
    actorUserId?: string | null;
    targetUserId?: string | null;
    title: string;
    body?: string | null;
  },
) {
  try {
    await prisma.institutionActivity.create({
      data: {
        institutionId,
        type: data.type,
        actorUserId: data.actorUserId ?? null,
        targetUserId: data.targetUserId ?? null,
        title: data.title,
        body: data.body ?? null,
      },
    });
  } catch (e) {
    console.warn("[logActivity] failed:", e);
  }
}
