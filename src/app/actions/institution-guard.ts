"use server";

import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { InstitutionMember, Institution, InstitutionRole } from "@/generated/client";

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

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return null;

    const member = await prisma.institutionMember.findFirst({
      where: { userId: dbUser.id, status: "ACTIVE" },
      include: { institution: true },
    });
    if (!member) return null;
    if (member.institution.status !== "ACTIVE") return null;

    return {
      member,
      institution: member.institution,
      role: member.role as InstitutionRole,
    };
  } catch {
    return null;
  }
});

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
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const pending = dbUser
      ? await prisma.institutionMember.findFirst({
          where: { userId: dbUser.id },
          include: { institution: true },
        })
      : null;
    if (pending && pending.institution.status === "PENDING") {
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
