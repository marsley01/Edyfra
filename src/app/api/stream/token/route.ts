import { NextRequest, NextResponse } from "next/server";
import { syncUserToStream, syncAIUserToStream, getServerStreamClient } from "@/lib/user-sync";

/**
 * POST /api/stream/token
 * Returns a valid Stream user token for the authenticated user.
 * Used by clients that need to silently refresh an expired token.
 *
 * Profile sync (user + mash-ai) is delegated to the centralized user-sync
 * pipeline so this endpoint stays a thin wrapper.
 */
export async function POST(_request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_STREAM_KEY || !process.env.STREAM_SECRET) {
      console.error("[Stream API] STREAM_KEY or STREAM_SECRET not configured");
      return NextResponse.json(
        { error: "Stream not configured" },
        { status: 503 },
      );
    }

    const profile = await syncUserToStreamForRequest();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await syncAIUserToStream();

    const client = getServerStreamClient();
    if (!client) {
      return NextResponse.json({ error: "Stream not configured" }, { status: 503 });
    }
    const token = client.createToken(profile.id);

    console.log(`[Stream API] Token issued for user: ${profile.id}`);

    return NextResponse.json({ token, userId: profile.id });
  } catch (err) {
    console.error("[Stream API] Token generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 },
    );
  }
}

async function syncUserToStreamForRequest() {
  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return syncUserToStream(user.id);
}
