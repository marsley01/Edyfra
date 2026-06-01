// Admin Setup and Verification
"use server";

import prisma from "@/lib/prisma";
import { Role } from "@/generated/client";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Check if a user is admin (checks both Prisma and Supabase)
async function isAdmin(userId: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          ...(data.user?.email ? [{ email: data.user.email }] : [])
        ]
      }
    });
    
    if (user && user.role === Role.ADMIN) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// Setup admin user (call this once to register the admin)
export async function setupAdminUser(email: string) {
  try {
    const supabase = await createClient();
    
    // Get user by email from Supabase
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return { error: "Service role key not configured" };
    }
    
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    
    // List users and find by email
    const { data: { users }, error } = await adminClient.auth.admin.listUsers();
    
    if (error) {
      return { error: error.message };
    }
    
    const supabaseUser = users.find(u => u.email === email);
    
    if (!supabaseUser) {
      return { error: "User not found in Supabase" };
    }
    
    // Create or update in Prisma
    const user = await prisma.user.upsert({
      where: { id: supabaseUser.id },
      create: {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.name || "Admin",
        role: Role.ADMIN,
        educationLevel: "UNIVERSITY",
        county: "Nairobi"
      },
      update: { role: Role.ADMIN }
    });
    
    // Update Supabase metadata
    await adminClient.auth.admin.updateUserById(supabaseUser.id, {
      user_metadata: { role: "ADMIN" }
    });
    
    return { success: true, userId: user.id };
  } catch (error) {
    console.error("Error setting up admin:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Get all users (with proper admin check)
export async function getAllUsers() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized: No user found");
    }
    
    // Check if user is admin
    const adminStatus = await isAdmin(user.id);
    if (!adminStatus) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        studentProfile: true,
        tutorProfile: true
      }
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    throw new Error("Failed to fetch users");
  }
}

// Delete user (with proper admin check)
export async function deleteUser(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized: No user found");
    }
    
    // Check if user is admin
    const adminStatus = await isAdmin(user.id);
    if (!adminStatus) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    // Delete from Prisma first
    await prisma.user.delete({ where: { id: userId } });
    
    // Try to delete from Supabase Auth
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const { createClient: createAdminClient } = await import("@supabase/supabase-js");
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await adminClient.auth.admin.deleteUser(userId);
      }
    } catch (e) {
      console.error("Failed to delete from Supabase Auth:", e);
    }
    
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteUser:", error);
    throw new Error("Failed to delete user");
  }
}

// Update user role (with proper admin check)
export async function updateUserRoleAdmin(userId: string, role: Role) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized: No user found");
    }
    
    // Check if user is admin
    const adminStatus = await isAdmin(user.id);
    if (!adminStatus) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: { role }
    });
    
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error in updateUserRoleAdmin:", error);
    throw new Error("Failed to update user role");
  }
}
