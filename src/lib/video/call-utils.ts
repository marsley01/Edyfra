/**
 * Pure helpers for Stream video calls. Isomorphic (no Node or DOM APIs) so
 * they can be shared by the server action, the browser components and tests.
 */

/** Stream's id limit for calls (same 64-char cap as chat channels). */
export const MAX_CALL_ID_LENGTH = 64;
export const CALL_TYPE = "default";
export const MASH_AI_USER_ID = "mash-ai";
/** How long an outgoing ring lasts before we give up (client-side backstop). */
export const RING_TIMEOUT_MS = 45_000;
/** How long the incoming-call sheet stays up before it counts as missed. */
export const INCOMING_TIMEOUT_S = 35;

/** 32-bit FNV-1a, hex encoded. Good enough to shorten ids deterministically. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Builds a fresh call id for a study room: `room-<roomId>-<time36><rand>`.
 * A new id per attempt makes every attempt ring (a ring on an existing,
 * already-ended call is ignored). Ids with characters Stream rejects, or that
 * would exceed 64 chars, use a hash of the room id instead; the real room id
 * always travels in the call's custom data (`custom.roomId`).
 */
export function buildRoomCallId(
  roomId: string,
  now: number = Date.now(),
  rand: string = Math.random().toString(36).slice(2, 6),
): string {
  const suffix = `${now.toString(36)}${rand.replace(/[^a-z0-9]/gi, "").slice(0, 4)}`;
  const safeRoom = /^[A-Za-z0-9_-]+$/.test(roomId) ? roomId : fnv1a(roomId);
  let id = `room-${safeRoom}-${suffix}`;
  if (id.length > MAX_CALL_ID_LENGTH) id = `room-${fnv1a(roomId)}-${suffix}`;
  return id;
}

/**
 * Who should be rung for a room. Returns null when the viewer is not a
 * participant (they may not start or join the room's call). The AI tutor has
 * no media and is never a call member.
 */
export function resolveRoomCallMembers(
  participants: Array<string | null | undefined>,
  viewerId: string,
): string[] | null {
  const ids = Array.from(
    new Set(participants.filter((p): p is string => !!p && p !== MASH_AI_USER_ID)),
  );
  if (!ids.includes(viewerId)) return null;
  return ids;
}

export type MediaErrorKind = "denied" | "not-found" | "in-use" | "insecure" | "unknown";

export function classifyMediaError(err: unknown): MediaErrorKind {
  const name = (err as { name?: string } | null)?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return "not-found";
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "in-use";
  if (name === "SecurityError" || name === "TypeError") return "insecure";
  return "unknown";
}

export function mediaErrorMessage(kind: MediaErrorKind): string {
  switch (kind) {
    case "denied":
      return "Camera and microphone are blocked. Click the camera icon in your browser's address bar, allow access, then try again.";
    case "not-found":
      return "No camera or microphone was found. Connect one and try again.";
    case "in-use":
      return "Your camera or microphone is being used by another app or tab. Close it and try again.";
    case "insecure":
      return "Your browser only allows camera and microphone on a secure (https) page.";
    default:
      return "We couldn't reach your camera or microphone. Check your device settings and try again.";
  }
}

/** Message shown to the caller when an outgoing ring ends without a join. */
export function outgoingEndMessage(
  reason: string | undefined,
  calleeName: string,
): string {
  switch (reason) {
    case "busy":
      return `${calleeName} is on another call. Try again in a bit.`;
    case "decline":
    case "rejected":
      return `${calleeName} declined the call.`;
    case "timeout":
    case "no-answer":
      return `${calleeName} didn't answer. Try again or send a message.`;
    case "cancel":
      return "Call cancelled.";
    default:
      return `The call with ${calleeName} couldn't connect. Try again.`;
  }
}

/** Maps errors thrown by Stream join/getOrCreate into user-facing text. */
export function callErrorMessage(err: unknown): string {
  const msg = String((err as { message?: string } | null)?.message || err || "");
  if (/NotAllowedError|Permission denied|permission/i.test(msg)) {
    return mediaErrorMessage("denied");
  }
  if (/token|auth|JWT|signature|401|403/i.test(msg)) {
    return "Your video session expired. Refresh the page and try again.";
  }
  if (/SFU|ICE|timeout|network|Failed to fetch|WS|websocket/i.test(msg)) {
    return "Couldn't reach the video server. Check your connection and try again.";
  }
  if (/ended|rejected|cancel/i.test(msg)) {
    return "The call ended before you could join.";
  }
  return "The call couldn't connect. Please try again.";
}
