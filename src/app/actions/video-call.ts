"use server";

import prisma from "@/lib/prisma";
import { syncUsersToStream } from "@/lib/user-sync";
import { resolveStreamViewer } from "@/lib/video/viewer";
import { buildRoomCallId, resolveRoomCallMembers, CALL_TYPE } from "@/lib/video/call-utils";
import { signRoomCall } from "@/lib/video/call-signature";
import { getStreamVideoServer } from "@/lib/video/server";

export type PrepareRoomCallResult =
  | {
      ok: true;
      callType: string;
      callId: string;
      /** Prisma ids of everyone to ring, including the caller. */
      memberIds: string[];
      viewerId: string;
      subject: string;
    }
  | { ok: false; error: string };

/**
 * Validates that the signed-in user is a participant of a study room
 * (matched Session or scheduled booking) and CREATES the call server-side:
 * created_by is the vetted caller, members come from the database (never from
 * the browser) and the custom data carries an HMAC (see call-signature.ts) so
 * the Stream webhook can tell a vetted room call from one a browser made up.
 * The browser then only rings it (`call.get({ ring: true })`).
 */
export async function prepareRoomCall(roomId: string): Promise<PrepareRoomCallResult> {
  try {
    if (typeof roomId !== "string" || !roomId || roomId.length > 128) {
      return { ok: false, error: "Invalid room." };
    }
    if (!process.env.NEXT_PUBLIC_STREAM_KEY || !process.env.STREAM_SECRET) {
      return { ok: false, error: "Video calling isn't available right now." };
    }

    const viewer = await resolveStreamViewer();
    if (!viewer) return { ok: false, error: "Please sign in again." };

    let participants: Array<string | null | undefined> | null = null;
    let subject = "Study session";

    const session = await prisma.session.findFirst({
      where: { OR: [{ id: roomId }, { roomId }] },
      select: { studentId: true, partnerId: true, subject: true, status: true },
    });

    if (session) {
      if (session.status === "COMPLETED" || session.status === "CANCELLED") {
        return { ok: false, error: "This session has ended." };
      }
      participants = [session.studentId, session.partnerId];
      subject = session.subject || subject;
    } else {
      // Scheduled bookings live in the Python-backed bookings table; this
      // action already enforces that the caller is the student or tutor.
      const { getBookingSessionData } = await import("@/app/actions/bookings");
      const booking = (await getBookingSessionData(roomId)) as
        | { studentId?: string; partnerId?: string | null; subject?: string }
        | null;
      if (booking) {
        participants = [booking.studentId, booking.partnerId];
        subject = booking.subject || subject;
      }
    }

    if (!participants) return { ok: false, error: "Room not found." };

    const memberIds = resolveRoomCallMembers(participants, viewer.id);
    if (!memberIds) return { ok: false, error: "You're not a participant in this room." };
    if (memberIds.length < 2) {
      return { ok: false, error: "There's nobody else in this room to call yet." };
    }

    await syncUsersToStream(memberIds);

    const server = getStreamVideoServer();
    if (!server) return { ok: false, error: "Video calling isn't available right now." };
    const callId = buildRoomCallId(roomId);
    const sig = signRoomCall(
      { callId, roomId, createdBy: viewer.id, members: memberIds },
      process.env.STREAM_SECRET as string,
    );
    await server.video.call(CALL_TYPE, callId).getOrCreate({
      data: {
        created_by_id: viewer.id,
        members: memberIds.map((user_id) => ({ user_id })),
        custom: { roomId, subject, kind: "study-room", members: memberIds, sig },
      },
    });

    return {
      ok: true,
      callType: CALL_TYPE,
      callId,
      memberIds,
      viewerId: viewer.id,
      subject,
    };
  } catch (err) {
    console.error("[prepareRoomCall] failed:", err);
    return { ok: false, error: "Couldn't start the call. Please try again." };
  }
}
