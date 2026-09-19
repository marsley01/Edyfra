import { describe, expect, it } from "vitest";
import {
  isLivePeerSearch,
  selectLivePeerRequest,
  type PendingPeerRequest,
} from "../peers";

const now = new Date("2026-09-01T12:00:00.000Z");

function req(
  overrides: Partial<PendingPeerRequest> & Pick<PendingPeerRequest, "id" | "studentId">,
): PendingPeerRequest {
  return {
    subject: "Math",
    createdAt: now,
    ...overrides,
  };
}

describe("isLivePeerSearch", () => {
  it("accepts a request created within the search window", () => {
    expect(isLivePeerSearch(new Date(now.getTime() - 20_000), now)).toBe(true);
  });

  it("rejects a stale request from someone who already left the queue", () => {
    expect(isLivePeerSearch(new Date(now.getTime() - 120_000), now)).toBe(false);
  });
});

describe("selectLivePeerRequest", () => {
  it("does not match the searching student to themselves", () => {
    const picked = selectLivePeerRequest("me", "Math", ["Math"], [
      req({ id: "a", studentId: "me" }),
    ], now);
    expect(picked).toBeNull();
  });

  it("does not match an offline student who is not currently searching", () => {
    const picked = selectLivePeerRequest("me", "Math", ["Math"], [], now);
    expect(picked).toBeNull();
  });

  it("does not match a stale queued request", () => {
    const picked = selectLivePeerRequest("me", "Math", ["Math"], [
      req({
        id: "stale",
        studentId: "offline-buddy",
        createdAt: new Date(now.getTime() - 5 * 60_000),
      }),
    ], now);
    expect(picked).toBeNull();
  });

  it("prefers a live peer on the same subject", () => {
    const picked = selectLivePeerRequest(
      "me",
      "Math",
      ["Math", "Physics"],
      [
        req({ id: "phys", studentId: "b", subject: "Physics" }),
        req({ id: "math", studentId: "c", subject: "Math" }),
      ],
      now,
    );
    expect(picked?.id).toBe("math");
  });

  it("falls back to a related subject before any other live searcher", () => {
    const picked = selectLivePeerRequest(
      "me",
      "Math",
      ["Math", "Physics"],
      [req({ id: "phys", studentId: "b", subject: "Physics" })],
      now,
    );
    expect(picked?.id).toBe("phys");
  });
});
