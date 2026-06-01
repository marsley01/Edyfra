import { NextRequest, NextResponse } from "next/server";
import { StreamChat } from "stream-chat";
import { createClient } from "@/utils/supabase/server";

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;
const STREAM_SECRET = process.env.STREAM_SECRET!;

let serverClient: StreamChat | null = null;

function getServerClient() {
  if (!serverClient) {
    serverClient = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);
  }
  return serverClient;
}

/**
 * POST /api/stream/token
 * Returns a valid Stream user token for the authenticated user.
 * Also upserts the user into Stream before returning.
 * Used by clients that need to silently refresh an expired token.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!STREAM_KEY || !STREAM_SECRET) {
      console.error("[Stream API] STREAM_KEY or STREAM_SECRET not configured");
      return NextResponse.json(
        { error: "Stream not configured" },
        { status: 503 }
      );
    }

    const client = getServerClient();

    // Upsert user into Stream before generating token
    await client.upsertUser({
      id: user.id,
      name:
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User",
      image: user.user_metadata?.avatar || undefined,
      role: "user",
    });

    const token = client.createToken(user.id);

    console.log(`[Stream API] Token issued for user: ${user.id}`);

    return NextResponse.json({ token, userId: user.id });
  } catch (err: any) {
    console.error("[Stream API] Token generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
