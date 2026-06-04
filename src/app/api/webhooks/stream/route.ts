import { NextResponse } from "next/server";
import { CheckSignature } from "stream-chat";
import prisma from "@/lib/prisma";

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;
const STREAM_SECRET = process.env.STREAM_SECRET!;

/**
 * Stream Webhook Handler
 *
 * This webhook now handles Stream VIDEO events (call.ring, call.session_started,
 * call.ended, etc.). The chat message.new webhook has been removed to prevent
 * duplicate Mash AI responses — Mash AI is now triggered client-side by the
 * sender of an @mash mention (see StreamChatRoom.tsx → `message.new` handler).
 *
 * Configure in Stream Dashboard:
 *   Dashboard → Video & Audio → Webhooks → Add webhook URL
 *   URL: https://edyfra-v2.vercel.app/api/webhooks/stream
 *   Events: call.* (all call-related events)
 */
export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-signature") || "";
    const rawBody = await request.text();

    // Verify webhook signature if a secret is configured.
    // (Stream uses HMAC-SHA256 over the raw body, keyed by your app secret.)
    if (STREAM_SECRET && signature) {
      const isValid = CheckSignature(rawBody, STREAM_SECRET, signature);
      if (!isValid) {
        console.warn("[StreamWebhook] Invalid signature");
        return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType: string = payload?.type || "";
    const call = payload?.call || {};
    const session = payload?.session || {};
    const createdBy = call?.created_by || {};

    // We only care about call events. Silently ack everything else.
    if (!eventType.startsWith("call.")) {
      return NextResponse.json({ success: true, message: "Ignored non-call event" });
    }

    const callId: string = call?.id || call?.cid?.split(":")?.[1] || "unknown";
    const callType: string = call?.type || call?.cid?.split(":")?.[0] || "default";

    // Find the Edyfra session that matches this Stream call/channel id.
    // We store the Stream channel id as the Edyfra session id, so we can
    // look it up directly. The call id is the same as the channel id.
    let edyfraSession: { id: string; subject: string; studentId: string; partnerId: string | null } | null = null;
    try {
      edyfraSession = await prisma.session.findUnique({
        where: { id: callId },
        select: { id: true, subject: true, studentId: true, partnerId: true },
      });
    } catch (e) {
      console.warn("[StreamWebhook] Session lookup failed:", e);
    }

    switch (eventType) {
      case "call.created": {
        console.log(`[StreamWebhook] call.created`, {
          callId, callType, createdBy: createdBy?.id,
          edyfraSessionId: edyfraSession?.id,
        });
        break;
      }
      case "call.ring": {
        console.log(`[StreamWebhook] call.ring`, {
          callId, callType, createdBy: createdBy?.id,
          edyfraSessionId: edyfraSession?.id,
        });
        break;
      }
      case "call.session_started": {
        console.log(`[StreamWebhook] call.session_started`, {
          callId, callType, startedBy: createdBy?.id,
          sessionId: session?.id, edyfraSessionId: edyfraSession?.id,
        });
        break;
      }
      case "call.ended": {
        const endedBy = payload?.ended_by || {};
        const durationSeconds = session?.ended_at && session?.started_at
          ? Math.max(0, Math.floor((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000))
          : null;
        console.log(`[StreamWebhook] call.ended`, {
          callId, endedBy: endedBy?.id, durationSeconds,
          reason: payload?.reason, edyfraSessionId: edyfraSession?.id,
        });
        break;
      }
      case "call.rejected": {
        console.log(`[StreamWebhook] call.rejected`, {
          callId, rejectedBy: createdBy?.id, edyfraSessionId: edyfraSession?.id,
        });
        break;
      }
      case "call.session_participant_joined": {
        console.log(`[StreamWebhook] call.session_participant_joined`, {
          callId, participant: payload?.participant?.user_id,
          edyfraSessionId: edyfraSession?.id,
        });
        break;
      }
      case "call.session_participant_left": {
        console.log(`[StreamWebhook] call.session_participant_left`, {
          callId, participant: payload?.participant?.user_id,
          edyfraSessionId: edyfraSession?.id,
        });
        break;
      }
      default:
        console.log(`[StreamWebhook] ${eventType}`, { callId, callType });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[StreamWebhook] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
