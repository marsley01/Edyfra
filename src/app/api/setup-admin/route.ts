// API endpoint to set up admin user
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { Role } from "@/generated/client";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: "Unauthorized: No user found" }, 
        { status: 401 }
      );
    }

    // Check if user is already admin in Prisma
    let adminUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (adminUser && adminUser.role === Role.ADMIN) {
      return NextResponse.json(
        { success: true, message: "User is already admin", userId: user.id },
        { status: 200 }
      );
    }

    // Create or update user as admin
    adminUser = await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || "Admin",
        role: Role.ADMIN,
        educationLevel: "UNIVERSITY",
        county: "Nairobi"
      },
      update: {
        role: Role.ADMIN
      }
    });

    // Update Supabase metadata
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const { createClient: createAdminClient } = await import("@supabase/supabase-js");
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await adminClient.auth.admin.updateUserById(user.id, {
          user_metadata: { role: "ADMIN" }
        });
      }
    } catch (e) {
      console.error("Failed to update Supabase metadata:", e);
    }

    return NextResponse.json(
      { success: true, message: "Admin user set up successfully", userId: adminUser.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error setting up admin:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}