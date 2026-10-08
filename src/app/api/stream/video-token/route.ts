// Stream dashboard setup for the "default" call type (Video & Audio):
//   - Backstage mode off.
//   - Ring settings: auto-cancel ~30-45s, incoming timeout ~30-45s.
//   - Roles: "user" may create calls and ring; joining should be limited to
//     call members (grant JoinCall to the "call_member" role rather than
//     "user") so only the room's participants can enter a call.
//   - Webhook: https://www.edyfra.online/api/webhooks/stream (call.* events).

import { StreamClient } from "@stream-io/node-sdk";
import { NextResponse } from "next/server";
import { resolveStreamViewer } from "@/lib/video/viewer";

/** Video tokens are short-lived; the browser refreshes through tokenProvider. */
const TOKEN_TTL_SECONDS = 60 * 60;

let streamClient: StreamClient | null = null;
function getClient(apiKey: string, secret: string) {
  if (!streamClient) streamClient = new StreamClient(apiKey, secret);
  return streamClient;
}

const noStore = { "Cache-Control": "no-store, max-age=0" };

/**
 * GET /api/stream/video-token
 * Issues a Stream Video token for the signed-in user. The Stream user id is
 * the PRISMA user id (same id chat uses), so ringing a member id taken from
 * the database reaches this user.
 */
export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
    const secret = process.env.STREAM_SECRET;
    if (!apiKey || !secret) {
      return NextResponse.json({ error: "Stream not configured" }, { status: 503, headers: noStore });
    }

    const viewer = await resolveStreamViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: noStore });
    }

    const client = getClient(apiKey, secret);

    // Make sure the user exists in Stream (with a fresh name/avatar) before
    // the browser connects or anyone rings them.
    await client.upsertUsers([
      {
        id: viewer.id,
        name: viewer.name,
        image: viewer.image || undefined,
        role: "user",
      },
    ]);

    const token = client.generateUserToken({
      user_id: viewer.id,
      validity_in_seconds: TOKEN_TTL_SECONDS,
    });

    return NextResponse.json(
      {
        token,
        userId: viewer.id,
        userName: viewer.name,
        userImage: viewer.image,
        apiKey,
        expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
      },
      { headers: noStore },
    );
  } catch (err) {
    console.error("[stream/video-token] Token generation failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Token generation failed" }, { status: 500, headers: noStore });
  }
}
