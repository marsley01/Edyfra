import { describe, it, expect } from "vitest";
import { signRoomCall, verifyRoomCall } from "../call-signature";

const SECRET = "test-secret";
const claims = { callId: "room-abc-123", roomId: "abc", createdBy: "u1", members: ["u1", "u2"] };

function payload(overrides: Record<string, unknown> = {}, custom: Record<string, unknown> = {}) {
  return {
    id: claims.callId,
    created_by: { id: claims.createdBy },
    custom: { roomId: claims.roomId, members: claims.members, sig: signRoomCall(claims, SECRET), ...custom },
    ...overrides,
  };
}

describe("verifyRoomCall", () => {
  it("accepts a call signed by prepareRoomCall", () => {
    expect(verifyRoomCall(payload(), SECRET)).toEqual(claims);
  });

  it("is independent of member order", () => {
    expect(verifyRoomCall(payload({}, { members: ["u2", "u1"] }), SECRET)).not.toBeNull();
  });

  it("rejects unsigned calls", () => {
    expect(verifyRoomCall(payload({}, { sig: undefined }), SECRET)).toBeNull();
  });

  it("rejects a sig copied onto another room, call, creator or member list", () => {
    expect(verifyRoomCall(payload({}, { roomId: "victim" }), SECRET)).toBeNull();
    expect(verifyRoomCall(payload({ id: "room-other" }), SECRET)).toBeNull();
    expect(verifyRoomCall(payload({ created_by: { id: "u2" } }), SECRET)).toBeNull();
    expect(verifyRoomCall(payload({}, { members: ["u1", "u2", "u3"] }), SECRET)).toBeNull();
  });

  it("rejects a different secret", () => {
    expect(verifyRoomCall(payload(), "other")).toBeNull();
  });
});
