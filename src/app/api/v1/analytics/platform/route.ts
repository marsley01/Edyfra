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
    return NextResponse.json({ valid: false, error: "Invalid or expired API key" }, { status: 401 });
  }

  try {
    const keyHash = await sha256Hex(apiKey);
    const now = new Date().toISOString();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("api_keys")
      .select("school_id, scopes")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ valid: false, error: "Invalid or expired API key" }, { status: 401 });
    }

    return NextResponse.json({ valid: true, school_id: data.school_id, scopes: data.scopes });
  } catch {
    return NextResponse.json({ valid: false, error: "Internal error" }, { status: 500 });
  }
}