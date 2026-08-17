import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const apiKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const keyHash = await sha256Hex(apiKey);
    const now = new Date().toISOString();

    const supabase = await createClient();
    const { data: keyRow, error: keyError } = await supabase
      .from("api_keys")
      .select("id")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle();

    if (keyError) throw keyError;

    if (!keyRow) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rooms, error } = await supabase
      .from("study_rooms")
      .select("id, name, subject, participant_count, max_participants, created_at")
      .eq("is_active", true)
      .eq("is_public", true)
      .order("participant_count", { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ rooms: rooms ?? [] });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}