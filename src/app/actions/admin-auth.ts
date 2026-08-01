"use server";

import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { Role } from "@/generated/client";
import { isFounderEmail } from "@/utils/admin-guard";

/**
 * Authoritative admin gate. Prisma is the source of truth for roles.
 * - Founder emails (ADMIN_EMAIL_1/2) are auto-promoted to ADMIN.
 * - If the user's Prisma role is ADMIN/FOUNDER, Supabase user_metadata
 *   is synced so middleware/layout routing stays consistent.
 * Returns whether the current user may access admin areas.
 */
export async function checkAdminAccess(): Promise<{ allowed: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || !user.email) return { allowed: false };

    const founder = isFounderEmail(user.email);

    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true },
    });

    // No Prisma record yet — create one (founders become ADMIN)
    if (!dbUser) {
      try {
        dbUser = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || "Admin User",
            role: founder ? Role.ADMIN : Role.STUDENT,
            county: "Nairobi",
          },
          select: { id: true, role: true },
        });
      } catch {
        return { allowed: false };
      }
    }

    let allowed = dbUser.role === Role.ADMIN || dbUser.role === Role.FOUNDER;

    // Auto-promote founders so the owner always has admin access
    if (!allowed && founder) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: Role.ADMIN },
      });
      allowed = true;
    }

    if (allowed) {
      const metadataRole = (user.user_metadata?.role || "").toUpperCase();
      if (metadataRole !== "ADMIN" && metadataRole !== "FOUNDER") {
        await supabase.auth.updateUser({ data: { role: "ADMIN" } });
      }
    }

    return { allowed };
  } catch (error) {
    console.error("[checkAdminAccess] Error:", error);
    return { allowed: false };
  }
}
