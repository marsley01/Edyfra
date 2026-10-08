import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const resourceSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(100),
  education_level: z.string().min(1).max(50),
  resource_type: z.string().min(1).max(50),
  topic: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().int().min(0).optional(),
  file_path: z.string().min(1).max(500),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const subject = searchParams.get("subject") || "";
    const level = searchParams.get("level") || "";
    const type = searchParams.get("type") || "";
    const topic = searchParams.get("topic") || "";
    const price = searchParams.get("price") || ""; // free or paid
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12") || 12));
    const skip = (page - 1) * limit;

    let query = supabase
      .from("resources")
      .select(`
        *,
        seller:User!seller_id ( id, name )
      `, { count: "exact" })
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(skip, skip + limit - 1);

    // Strip characters that would break out of the PostgREST or() filter syntax
    const safeSearch = search.replace(/[,()*%\\]/g, " ").trim();
    if (safeSearch) {
      query = query.or(`title.ilike.%${safeSearch}%,subject.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
    }

    if (subject) {
      query = query.ilike("subject", `%${subject}%`);
    }

    if (level) {
      query = query.eq("education_level", level);
    }

    if (type) {
      query = query.eq("resource_type", type);
    }

    if (topic) {
      query = query.ilike("topic", `%${topic}%`);
    }

    if (price === "free") {
      query = query.eq("price", 0);
    } else if (price === "paid") {
      query = query.gt("price", 0);
    }

    const { data: resources, count, error } = await query;
    if (error) throw error;

    const total = count || 0;

    return NextResponse.json({
      resources: resources || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Resources API] Error:", error.message);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = resourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { title, subject, education_level, resource_type, topic, description, price, file_path } = parsed.data;

    // The file must be one this user uploaded to their own folder; otherwise a
    // user could list (and sell) someone else's file.
    if (
      file_path.includes("..") ||
      !(file_path.startsWith(`${user.id}/`) || file_path.startsWith(`resources/${user.id}/`))
    ) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    const { data: resource, error } = await supabase
      .from("resources")
      .insert({
        seller_id: user.id,
        title,
        subject,
        education_level,
        resource_type,
        topic: topic || null,
        description: description || null,
        price: price || 0,
        file_path,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, resource });
  } catch (error: any) {
    console.error("[Resources API POST] Error:", error);
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}