import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStreamVideoServer } from "@/lib/video/server";
import { verifyRoomCall } from "@/lib/video/call-signature";
import { notifyStreamUser } from "@/lib/video/notify";
import { MASH_AI_USER_ID } from "@/lib/video/call-utils";

/**
 * Stream Video webhook.
 *
 * Configure in the Stream Dashboard → Video & Audio → Webhooks:
 *   URL:    https://www.edyfra.online/api/webhooks/stream
 *   Events: call.* (session_started, ended, missed, rejected, ...)
 *
 * Every request is verified against the app secret (HMAC-SHA256 of the raw
 * body, `X-Signature` header; gzip bodies are handled by the SDK).
 *
 * Calls can be created by any browser with any custom data, so effects only
 * apply to calls created by prepareRoomCall, whose custom data carries an
 * HMAC over (call id, room id, creator, members) — see call-signature.ts.
 *
 * Effects:
 *   - call.session_started → an ACTIVE study session gets its startedAt, when
 *                            the caller is one of its participants. A call
 *                            never activates a PENDING booking: that still
 *                            needs the tutor/admin confirmation.
 *   - call.missed          → signed members who missed the ring get one
 *                            notification each (deduped across retries)
 *   - other call events    → logged
 * Chat events are ignored (Mash AI replies are triggered client-side).
 */

type WebhookPayload = {
  type?: string;
  call_cid?: string;
  call?: {
    id?: string;
    cid?: string;
    type?: string;
    custom?: Record<string, unknown>;
    created_by?: { id?: string; name?: string };
    session?: { started_at?: string | Date; ended_at?: string | Date } | null;
  };
  user?: { id?: string; name?: string };
  members?: Array<{ user_id?: string; user?: { id?: string } }>;
  session_id?: string;
  reason?: string;
};

async function findSession(roomId: string) {
  return prisma.session.findFirst({
    where: { OR: [{ id: roomId }, { roomId }] },
    select: { id: true, status: true, startedAt: true, studentId: true, partnerId: true },
  });
}

export async function POST(request: Request) {
  const client = getStreamVideoServer();
  const secret = process.env.STREAM_SECRET || "";
  if (!client || !secret) {
    return NextResponse.json({ success: false, error: "Stream not configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-signature") || "";
  if (!signature) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    const raw = Buffer.from(await request.arrayBuffer());
    payload = client.verifyAndParseWebhook(raw, signature) as unknown as WebhookPayload;
  } catch {
    console.warn("[StreamWebhook] Invalid signature or body");
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
  }

  const eventType = payload?.type || "";
  if (!eventType.startsWith("call.")) {
    return NextResponse.json({ success: true, message: "Ignored non-call event" });
  }

  const call = payload.call;
  const callId = call?.id || payload.call_cid?.split(":")[1] || "unknown";
  // null for calls prepareRoomCall didn't create (or whose custom data changed)
  const signed = verifyRoomCall(call, secret);
  const roomId = signed?.roomId ?? null;

  try {
    switch (eventType) {
      case "call.session_started": {
        if (!signed) break;
        const session = await findSession(signed.roomId);
        const isParticipant =
          !!session && (session.studentId === signed.createdBy || session.partnerId === signed.createdBy);
        if (session && isParticipant && session.status === "ACTIVE" && !session.startedAt) {
          await prisma.session.updateMany({
            where: { id: session.id, status: "ACTIVE", startedAt: null },
            data: { startedAt: new Date() },
          });
        }
        console.log("[StreamWebhook] call.session_started", { callId, roomId, sessionId: session?.id });
        break;
      }

      case "call.missed": {
        if (!signed) {
          console.log("[StreamWebhook] call.missed ignored (unsigned call)", { callId });
          break;
        }
        const callerId = signed.createdBy;
        const callerName = call?.created_by?.name || "Someone";
        // Only members prepareRoomCall vetted from the database, never ids a
        // browser added to the call afterwards
        const allowed = new Set(signed.members);
        const candidates = new Set<string>();
        for (const m of payload.members ?? []) {
          const id = m.user_id || m.user?.id;
          if (id) candidates.add(id);
        }
        // When the event names the specific member, only notify them
        const target = payload.user?.id;
        const recipients = (target && target !== callerId ? [target] : [...candidates]).filter(
          (id) => allowed.has(id) && id !== callerId && id !== MASH_AI_USER_ID,
        );
        // The call id in the link makes the row unique per call, so webhook
        // retries are deduped by notifyStreamUser
        const actionUrl = `/study-room/${encodeURIComponent(signed.roomId)}?call=${encodeURIComponent(callId)}`;
        let sent = 0;
        for (const userId of recipients) {
          try {
            const ok = await notifyStreamUser(userId, {
              type: "MISSED_CALL",
              title: "Missed video call",
              body: `You missed a video call from ${callerName}.`,
              actionUrl,
            });
            if (ok) sent++;
          } catch (err) {
            console.warn("[StreamWebhook] missed-call notify failed:", err);
          }
        }
        console.log("[StreamWebhook] call.missed", { callId, roomId, recipients: recipients.length, sent });
        break;
      }

      case "call.ended": {
        const s = call?.session;
        const durationSeconds =
          s?.started_at && s?.ended_at
            ? Math.max(0, Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000))
            : null;
        console.log("[StreamWebhook] call.ended", { callId, roomId, durationSeconds, reason: payload.reason });
        break;
      }

      default:
        console.log("[StreamWebhook] %s", eventType, { callId, roomId });
    }
  } catch (err) {
    // Ack anyway: retries would only repeat the same failure
    console.error("[StreamWebhook] handler failed:", eventType, err);
  }

  return NextResponse.json({ success: true });
}
