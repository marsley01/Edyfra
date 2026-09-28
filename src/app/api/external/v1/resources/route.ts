import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request, "resources");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const subject = searchParams.get("subject") || "";
    const level = searchParams.get("level") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const supabase = createAdminClient();
    let query = supabase
      .from("resources")
      .select(`
        id,
        title,
        subject,
        educationLevel:education_level,
        resourceType:resource_type,
        topic,
        description,
        price,
        filePath:file_path,
        createdAt:created_at,
        seller:users!seller_id ( id, name )
      `)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`title.ilike.%${search}%,subject.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (subject) query = query.ilike("subject", `%${subject}%`);
    if (level) query = query.eq("education_level", level);

    const { data: resources, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      resources: resources || [],
      count: resources?.length || 0,
    });
  } catch (error) {
    console.error("[External Resources] Error:", error);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}
