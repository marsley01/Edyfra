// Admin Setup and Verification
"use server";

import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { Role } from "@/generated/client";
import { getAdminCaller } from "@/app/actions/_admin-guard";
import {
  getAllUsers as getAllUsersAdmin,
  deleteUser as deleteUserAdmin,
  updateUserRoleAdmin as updateUserRoleAdminImpl,
} from "@/app/actions/admin";

// NOTE: users live in the Prisma "User" table. This file previously queried a
// non-existent supabase "users" table, which (a) made every admin check fail
// and (b) made the "no admins exist yet" bootstrap check ALWAYS true, so any
// caller could promote any email to ADMIN whenever ADMIN_BOOTSTRAP_SECRET was
// set — without ever presenting that secret.

function secretsMatch(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Setup admin user (call this once to register the admin)
export async function setupAdminUser(email: string, bootstrapSecret?: string) {
  try {
    const supabase = await createClient();
    const { data: { user: caller } } = await supabase.auth.getUser();

    const callerIsAdmin = (await getAdminCaller()) !== null;

    const existingAdminCount = await prisma.user.count({
      where: { role: { in: [Role.ADMIN, Role.FOUNDER] } },
    });

    const isBootstrap =
      existingAdminCount === 0 &&
      secretsMatch(bootstrapSecret, process.env.ADMIN_BOOTSTRAP_SECRET) &&
      (process.env.ADMIN_BOOTSTRAP_EMAIL
        ? process.env.ADMIN_BOOTSTRAP_EMAIL === email
        : true);

    if (!callerIsAdmin && !isBootstrap) {
      console.warn(
        `[setupAdminUser] Blocked: caller=${caller?.id || "anonymous"} target=${email} existingAdmins=${existingAdminCount}`,
      );
      return { error: "Unauthorized: only an existing admin can promote another user." };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return { error: "Service role key not configured" };
    }

    const { createClient: createSupabaseJs } = await import("@supabase/supabase-js");
    const adminClient = createSupabaseJs(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { users }, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      return { error: error.message };
    }

    const supabaseUser = users.find(u => u.email === email);

    if (!supabaseUser) {
      return { error: "User not found in Supabase" };
    }

    const user = await prisma.user.upsert({
      where: { id: supabaseUser.id },
      create: {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.name || "Admin",
        role: Role.ADMIN,
        educationLevel: "UNIVERSITY",
        county: "Nairobi",
      },
      update: { role: Role.ADMIN },
      select: { id: true },
    });

    await adminClient.auth.admin.updateUserById(supabaseUser.id, {
      user_metadata: { role: "ADMIN" }
    });

    return { success: true, userId: user.id };
  } catch (error) {
    console.error("Error setting up admin:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Get all users (with proper admin check) — delegates to the Prisma-backed
// implementation in admin.ts.
export async function getAllUsers() {
  return getAllUsersAdmin();
}

// Delete user (with proper admin check)
export async function deleteUser(userId: string) {
  return deleteUserAdmin(userId);
}

// Update user role (with proper admin check)
export async function updateUserRoleAdmin(userId: string, role: string) {
  if (!Object.values(Role).includes(role as Role)) {
    return { error: "Invalid role" };
  }
  return updateUserRoleAdminImpl(userId, role as Role);
}
