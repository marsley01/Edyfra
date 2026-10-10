import { NextRequest, NextResponse } from "next/server";
import { syncUserToStream, syncAIUserToStream, getServerStreamClient } from "@/lib/user-sync";
import { resolveStreamViewer } from "@/lib/video/viewer";

const noStore = { "Cache-Control": "no-store, max-age=0" };

/**
 * POST /api/stream/token
 * Returns a valid Stream (chat) user token for the authenticated user.
 * Used by clients that need to silently refresh an expired token.
 *
 * The token is issued for the user's PRISMA id — the id every Stream channel
 * membership and call member uses — not the Supabase auth id, which differs
 * for some older accounts.
 */
export async function POST(_request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_STREAM_KEY || !process.env.STREAM_SECRET) {
      console.error("[Stream API] STREAM_KEY or STREAM_SECRET not configured");
      return NextResponse.json({ error: "Stream not configured" }, { status: 503, headers: noStore });
    }

    const viewer = await resolveStreamViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
    }

    const client = getServerStreamClient();
    if (!client) {
      return NextResponse.json({ error: "Stream not configured" }, { status: 503, headers: noStore });
    }

    // Best-effort profile sync; a sync failure must not block the token
    await syncUserToStream(viewer.id).catch((err) => {
      console.warn("[Stream API] profile sync failed:", err);
    });
    await syncAIUserToStream().catch(() => {});

    // Same id /api/stream/video-token and getStreamToken use
    const userId = viewer.id;
    const token = client.createToken(userId);

    return NextResponse.json({ token, userId }, { headers: noStore });
  } catch (err) {
    console.error("[Stream API] Token generation failed:", err);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500, headers: noStore });
  }
}
