import { describe, it, expect } from "vitest";
import { formatCurrency, pluralize, truncate, clamp, range, pick, omit, groupBy, shuffle } from "@/shared/utils";

describe("formatCurrency", () => {
  it("formats KES currency", () => {
    const result = formatCurrency(500);
    expect(result).toContain("500");
  });

  it("handles zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0");
  });
});

describe("pluralize", () => {
  it("returns singular for count 1", () => {
    expect(pluralize(1, "student")).toBe("student");
  });

  it("returns plural for other counts", () => {
    expect(pluralize(5, "student")).toBe("students");
  });

  it("respects custom plural", () => {
    expect(pluralize(2, "child", "children")).toBe("children");
  });
});

describe("truncate", () => {
  it("returns full string if within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates and adds ellipsis", () => {
    expect(truncate("hello world this is long", 10)).toBe("hello worl...");
  });
});

describe("clamp", () => {
  it("clamps within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("range", () => {
  it("creates number range", () => {
    expect(range(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("pick", () => {
  it("picks specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });
});

describe("omit", () => {
  it("omits specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ["b"])).toEqual({ a: 1, c: 3 });
  });
});

describe("groupBy", () => {
  it("groups items by key function", () => {
    const items = [
      { category: "A", name: "1" },
      { category: "B", name: "2" },
      { category: "A", name: "3" },
    ];
    const grouped = groupBy(items, (i) => i.category);
    expect(grouped["A"]!.length).toBe(2);
    expect(grouped["B"]!.length).toBe(1);
  });
});

describe("shuffle", () => {
  it("returns array of same length", () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr);
    expect(shuffled.length).toBe(arr.length);
    expect(shuffled.sort()).toEqual(arr.sort());
  });
});
