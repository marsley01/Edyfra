"use server";

import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { InstitutionMember, Institution, InstitutionRole, Prisma } from "@/generated/client";

/**
 * Canonical "what institution does the current user belong to, and in
 * what role" resolver. Returns the active membership + institution or
 * null if the user is not an institution member.
 *
 * Membership is considered active if:
 *   • InstitutionMember.status === "ACTIVE" AND
 *   • Institution.status === InstitutionStatus.ACTIVE
 */
export const getActiveInstitutionMembership = cache(async (): Promise<{
  member: InstitutionMember;
  institution: Institution;
  role: InstitutionRole;
} | null> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const dbUser = await resolveDbUser(user.id, user.email);
    if (!dbUser) return null;
    if (dbUser.banned || dbUser.suspended) return null;

    // A user can hold several memberships (e.g. student at one school, admin
    // at another). Only consider memberships of active institutions, and
    // prefer the most privileged role so an admin is never resolved to an
    // unrelated student membership and bounced out of the dashboard.
    const members = await prisma.institutionMember.findMany({
      where: { userId: dbUser.id, status: "ACTIVE", institution: { isActive: true } },
      include: { institution: true },
      orderBy: { joinedAt: "asc" },
    });
    const ROLE_PRIORITY = ["INSTITUTION_ADMIN", "INSTITUTION_DEPUTY", "INSTITUTION_TEACHER", "INSTITUTION_STUDENT"];
    const rank = (role: string) => {
      const i = ROLE_PRIORITY.indexOf(role);
      return i === -1 ? ROLE_PRIORITY.length : i;
    };
    const member = [...members].sort((a, b) => rank(a.role) - rank(b.role))[0];
    if (!member) return null;

    return {
      member,
      institution: member.institution,
      role: member.role as InstitutionRole,
    };
  } catch {
    return null;
  }
});

// Prisma user ids differ from Supabase auth ids for some older accounts, so
// the profile is resolved by auth id first, then by email. Not exported: every
// export of a "use server" module is a callable server action.
async function resolveDbUser(authId: string, email: string | undefined | null) {
  const or: Prisma.UserWhereInput[] = [{ id: authId }];
  if (email) or.push({ email: { equals: email, mode: "insensitive" } });
  const rows = await prisma.user.findMany({ where: { OR: or }, take: 2 });
  return rows.find((r) => r.id === authId) ?? rows[0] ?? null;
}

/**
 * Server-side guard for the institution admin dashboard. Redirects to
 * /institution/login if the user is not signed in, or to /institution/pending
 * if their application is still under review.
 *
 * Returns the membership + institution for the calling page to use.
 */
export async function requireInstitutionAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/institution/login");

  const membership = await getActiveInstitutionMembership();
  if (!membership) {
    // The user is signed in but not an active member — figure out why
    // and route them appropriately.
    const dbUser = await resolveDbUser(user.id, user.email);
    const pending = dbUser
      ? await prisma.institutionMember.findFirst({
          where: { userId: dbUser.id, institution: { isActive: false } },
          include: { institution: true },
          orderBy: { createdAt: "desc" },
        })
      : null;
    if (pending) {
      redirect("/institution/pending");
    }
    redirect("/institution/login");
  }

  if (
    membership.role !== "INSTITUTION_ADMIN" &&
    membership.role !== "INSTITUTION_DEPUTY"
  ) {
    redirect("/institution/login");
  }

  return membership;
}

/**
 * Lighter guard for the institution portal generally (any role).
 */
export async function requireInstitutionMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/institution/login");
  const membership = await getActiveInstitutionMembership();
  if (!membership) redirect("/institution/login");
  return membership;
}
