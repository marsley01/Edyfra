// Admin Setup and Verification
"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

// Check if a user is admin
async function isAdmin(userId: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    const adminSupabase = createAdminClient();
    const { data: user } = await adminSupabase
      .from("users")
      .select("role")
      .or(`id.eq.${userId}${data.user?.email ? `,email.eq.${data.user.email}` : ""}`)
      .limit(1)
      .maybeSingle();

    if (user && (user.role === "ADMIN" || user.role === "FOUNDER")) {
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
    const { data: { user: caller } } = await supabase.auth.getUser();

    const callerIsAdmin = caller ? await isAdmin(caller.id) : false;
    const adminSupabase = createAdminClient();

    const { count: existingAdminCount } = await adminSupabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "ADMIN");

    const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    const isBootstrap =
      (existingAdminCount || 0) === 0 &&
      bootstrapSecret &&
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

    const { data: user, error: uErr } = await adminSupabase
      .from("users")
      .upsert({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.name || "Admin",
        role: "ADMIN",
        education_level: "UNIVERSITY",
        county: "Nairobi",
      }, { onConflict: "id" })
      .select("id")
      .single();

    if (uErr || !user) throw uErr || new Error("Failed to upsert user");

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
    
    const adminStatus = await isAdmin(user.id);
    if (!adminStatus) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    const adminSupabase = createAdminClient();
    const { data: users } = await adminSupabase
      .from("users")
      .select("*, studentProfile:student_profiles(*), tutorProfile:tutor_profiles(*)")
      .order("created_at", { ascending: false });

    return (users || []).map(u => ({
      ...u,
      createdAt: u.created_at,
      studentProfile: u.studentProfile?.[0] || null,
      tutorProfile: u.tutorProfile?.[0] || null,
    }));
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
    
    const adminStatus = await isAdmin(user.id);
    if (!adminStatus) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    const adminSupabase = createAdminClient();
    await adminSupabase.from("users").delete().eq("id", userId);
    
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const { createClient: createSupabaseJs } = await import("@supabase/supabase-js");
        const adminClient = createSupabaseJs(
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
export async function updateUserRoleAdmin(userId: string, role: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Unauthorized: No user found");
    }
    
    const adminStatus = await isAdmin(user.id);
    if (!adminStatus) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    const adminSupabase = createAdminClient();
    await adminSupabase
      .from("users")
      .update({ role })
      .eq("id", userId);
    
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error in updateUserRoleAdmin:", error);
    throw new Error("Failed to update user role");
  }
}
