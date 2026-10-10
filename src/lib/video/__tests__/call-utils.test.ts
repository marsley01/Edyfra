import { describe, expect, it } from "vitest";
import {
  MAX_CALL_ID_LENGTH,
  buildRoomCallId,
  callErrorMessage,
  classifyMediaError,
  fnv1a,
  outgoingEndMessage,
  resolveRoomCallMembers,
} from "../call-utils";

describe("buildRoomCallId", () => {
  it("embeds a cuid room id with a time+random suffix", () => {
    const id = buildRoomCallId("clx1abc2def3ghi4jkl5mno6", 1_700_000_000_000, "ab12");
    expect(id).toBe(`room-clx1abc2def3ghi4jkl5mno6-${(1_700_000_000_000).toString(36)}ab12`);
    expect(id.length).toBeLessThanOrEqual(MAX_CALL_ID_LENGTH);
  });

  it("fits a 36-char uuid room id under Stream's 64-char limit", () => {
    const id = buildRoomCallId("123e4567-e89b-12d3-a456-426614174000", Date.now(), "zz99");
    expect(id.length).toBeLessThanOrEqual(MAX_CALL_ID_LENGTH);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes ids that are too long or contain unsafe characters", () => {
    const long = buildRoomCallId("x".repeat(80), 1, "aaaa");
    expect(long.length).toBeLessThanOrEqual(MAX_CALL_ID_LENGTH);
    expect(long.startsWith(`room-${fnv1a("x".repeat(80))}-`)).toBe(true);

    const unsafe = buildRoomCallId("room:with/slash", 1, "aaaa");
    expect(unsafe).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("is unique per attempt so every attempt rings", () => {
    expect(buildRoomCallId("r", 1, "aaaa")).not.toBe(buildRoomCallId("r", 2, "aaaa"));
  });
});

describe("resolveRoomCallMembers", () => {
  it("returns both participants when the viewer is one of them", () => {
    expect(resolveRoomCallMembers(["student", "tutor"], "tutor")).toEqual(["student", "tutor"]);
  });

  it("rejects viewers who are not participants", () => {
    expect(resolveRoomCallMembers(["student", "tutor"], "stranger")).toBeNull();
  });

  it("drops the AI tutor, nulls and duplicates", () => {
    expect(resolveRoomCallMembers(["s", "mash-ai", null, "s", undefined], "s")).toEqual(["s"]);
  });
});

describe("media + call errors", () => {
  it("classifies getUserMedia errors", () => {
    expect(classifyMediaError({ name: "NotAllowedError" })).toBe("denied");
    expect(classifyMediaError({ name: "NotFoundError" })).toBe("not-found");
    expect(classifyMediaError({ name: "NotReadableError" })).toBe("in-use");
    expect(classifyMediaError({ name: "SecurityError" })).toBe("insecure");
    expect(classifyMediaError(new Error("x"))).toBe("unknown");
  });

  it("explains why an outgoing ring ended", () => {
    expect(outgoingEndMessage("busy", "Amina")).toContain("another call");
    expect(outgoingEndMessage("decline", "Amina")).toContain("declined");
    expect(outgoingEndMessage("timeout", "Amina")).toContain("didn't answer");
  });

  it("maps Stream errors to readable text", () => {
    expect(callErrorMessage(new Error("JWT token expired"))).toContain("expired");
    expect(callErrorMessage(new Error("SFU join timeout"))).toContain("video server");
  });
});
