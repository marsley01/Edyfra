/**
 * Server-only proof that a study-room call was vetted by prepareRoomCall.
 *
 * Calls are created server-side (created_by = the vetted caller, members from
 * the database), but any signed-in browser can still create its own call and
 * put whatever it likes in `custom`. The webhook therefore only trusts calls
 * whose custom data carries an HMAC over (call id, room id, creator, members),
 * keyed with the Stream secret, which browsers never see.
 *
 * Not a "use server" module: nothing here is browser-callable.
 */
import { createHmac, timingSafeEqual } from "crypto";

export interface RoomCallClaims {
  callId: string;
  roomId: string;
  createdBy: string;
  members: string[];
}

function canonical(c: RoomCallClaims): string {
  const members = Array.from(new Set(c.members)).sort();
  return JSON.stringify(["edyfra-room-call:v1", c.callId, c.roomId, c.createdBy, members]);
}

export function signRoomCall(claims: RoomCallClaims, secret: string): string {
  return createHmac("sha256", secret).update(canonical(claims)).digest("base64url");
}

type CallLike = {
  id?: string;
  custom?: Record<string, unknown>;
  created_by?: { id?: string };
};

/**
 * Returns the signed claims of a webhook call payload, or null when the call
 * was not created by prepareRoomCall (or its custom data was altered).
 */
export function verifyRoomCall(call: CallLike | undefined | null, secret: string): RoomCallClaims | null {
  if (!call || !secret) return null;
  const custom = call.custom || {};
  const callId = call.id;
  const createdBy = call.created_by?.id;
  const roomId = custom.roomId;
  const members = custom.members;
  const sig = custom.sig;
  if (
    typeof callId !== "string" || !callId ||
    typeof createdBy !== "string" || !createdBy ||
    typeof roomId !== "string" || !roomId ||
    typeof sig !== "string" || !sig ||
    !Array.isArray(members) || !members.every((m) => typeof m === "string")
  ) {
    return null;
  }
  const claims: RoomCallClaims = { callId, roomId, createdBy, members: members as string[] };
  if (!claims.members.includes(createdBy)) return null;

  const expected = Buffer.from(signRoomCall(claims, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return claims;
}
