import { describe, it, expect } from "vitest";
import { sanitizeText, sanitizeFilename } from "@/lib/sanitize";

describe("sanitizeText", () => {
  it("strips HTML tags", () => {
    // DOMPurify with ALLOWED_TAGS:[] strips script tags AND their content
    expect(sanitizeText("<script>alert('xss')</script>hello")).toBe("hello");
  });

  it("removes null bytes", () => {
    expect(sanitizeText("hello\x00world")).toBe("helloworld");
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeText("")).toBe("");
  });
});

describe("sanitizeFilename", () => {
  it("removes path traversal", () => {
    // /  → _ then leading underscores stripped → etc_passwd
    expect(sanitizeFilename("../../../etc/passwd")).toBe("etc_passwd");
  });

  it("replaces special chars with underscores", () => {
    expect(sanitizeFilename("hello world.txt")).toBe("hello_world.txt");
  });

  it("truncates long filenames", () => {
    const long = "a".repeat(200) + ".txt";
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(100);
  });

  it("removes null bytes", () => {
    expect(sanitizeFilename("file\x00name.txt")).toBe("filename.txt");
  });
});
