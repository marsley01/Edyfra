import { describe, expect, it } from "vitest";
import {
  compareRanked,
  decodeCursor,
  encodeCursor,
  fieldMatch,
  paginate,
  queryFingerprint,
  scoreSearchCandidate,
  MATCH_CONTAINS,
  MATCH_EXACT,
  MATCH_NONE,
  MATCH_PREFIX,
} from "../search-rank";

describe("fieldMatch", () => {
  it("classifies exact / prefix / word-prefix / contains / none, case-insensitively", () => {
    expect(fieldMatch("Physics", "physics")).toBe(MATCH_EXACT);
    expect(fieldMatch("Physics", "PHY")).toBe(MATCH_PREFIX);
    expect(fieldMatch("Jane Kamau", "kam")).toBe(MATCH_PREFIX);
    expect(fieldMatch("Jane Kamau", "amau")).toBe(MATCH_CONTAINS);
    expect(fieldMatch("Jane", "x")).toBe(MATCH_NONE);
    expect(fieldMatch(null, "x")).toBe(MATCH_NONE);
    expect(fieldMatch("computer_science", "computer science")).toBe(MATCH_EXACT);
  });
});

describe("scoreSearchCandidate", () => {
  const rank = (cands: Parameters<typeof scoreSearchCandidate>[0][], q: string) =>
    cands
      .map((c) => ({ id: c.id, s: scoreSearchCandidate(c, q) }))
      .filter((x) => x.s)
      .map((x) => ({ id: x.id, score: x.s!.score }))
      .sort(compareRanked)
      .map((x) => x.id);

  it("ranks exact > prefix > contains regardless of field", () => {
    const ids = rank(
      [
        { id: "contains", name: "Ann Marie" }, // "mar" contains? -> word prefix actually
        { id: "inside", name: "Omari Otieno" },
        { id: "exact", county: "Mar" },
        { id: "prefix", name: "Mark Kip" },
      ],
      "mar",
    );
    expect(ids[0]).toBe("exact");
    expect(ids.indexOf("prefix")).toBeLessThan(ids.indexOf("inside"));
    expect(ids[ids.length - 1]).toBe("inside");
  });

  it("matches subjects, school, level and county", () => {
    expect(scoreSearchCandidate({ id: "a", subjects: ["Chemistry"] }, "chem")?.matchedOn).toBe("subject");
    expect(scoreSearchCandidate({ id: "a", school: "Alliance High School" }, "alliance")?.matchedOn).toBe("school");
    expect(scoreSearchCandidate({ id: "a", levels: ["Form 3"] }, "form 3")?.matchedOn).toBe("level");
    expect(scoreSearchCandidate({ id: "a", county: "Kiambu" }, "kiambu")?.matchedOn).toBe("county");
  });

  it("within a tier a name match beats a county match", () => {
    const ids = rank([{ id: "county", county: "Nakuru" }, { id: "name", name: "Nakuru" }], "nakuru");
    expect(ids).toEqual(["name", "county"]);
  });

  it("multi-word queries match across fields", () => {
    const s = scoreSearchCandidate({ id: "a", name: "Jane Kamau", subjects: ["Physics"] }, "jane physics");
    expect(s).not.toBeNull();
    expect(scoreSearchCandidate({ id: "a", name: "Jane Kamau" }, "jane physics")).toBeNull();
  });

  it("boost only reorders inside a tier", () => {
    const boosted = scoreSearchCandidate({ id: "b", name: "Physics Fan" }, "physics fa", 1)!;
    const exact = scoreSearchCandidate({ id: "e", name: "physics fa" }, "physics fa", 0)!;
    expect(exact.score).toBeGreaterThan(boosted.score);
  });

  it("returns null for non-matches", () => {
    expect(scoreSearchCandidate({ id: "a", name: "Brian" }, "zzz")).toBeNull();
  });
});

describe("cursor pagination", () => {
  const fp = queryFingerprint({ q: "math", role: "TUTOR" });
  const list = Array.from({ length: 45 }, (_, i) => i);

  it("walks pages without overlap or gaps", () => {
    const p1 = paginate(list, null, 20, fp);
    const p2 = paginate(list, p1.nextCursor, 20, fp);
    const p3 = paginate(list, p2.nextCursor, 20, fp);
    expect([...p1.items, ...p2.items, ...p3.items]).toEqual(list);
    expect(p3.nextCursor).toBeNull();
  });

  it("ignores a cursor from a different query", () => {
    const other = encodeCursor(20, queryFingerprint({ q: "bio" }));
    expect(decodeCursor(other, fp)).toBe(0);
    expect(decodeCursor("garbage", fp)).toBe(0);
    expect(decodeCursor(encodeCursor(20, fp), fp)).toBe(20);
  });

  it("clamps the page size", () => {
    expect(paginate(list, null, 1000, fp).items).toHaveLength(45);
    expect(paginate(list, null, 0, fp).items).toHaveLength(20);
  });
});
