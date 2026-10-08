import { describe, it, expect } from "vitest";
import { emailTypoMessage, normalizeEmail, suggestEmailCorrection } from "@/lib/institution-email";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Principal@School.AC.KE ")).toBe("principal@school.ac.ke");
  });
});

describe("suggestEmailCorrection", () => {
  it.each([
    ["head@school.cpm", "head@school.com"],
    ["head@school.con", "head@school.com"],
    ["head@school.comm", "head@school.com"],
    ["jane@gmial.com", "jane@gmail.com"],
    ["jane@gamil.con", "jane@gmail.com"],
    ["jane@gmail.co", "jane@gmail.com"],
    ["admin@kenyahigh.co.ek", "admin@kenyahigh.co.ke"],
  ])("corrects %s", (input, expected) => {
    expect(suggestEmailCorrection(input)).toBe(expected);
  });

  it.each(["head@school.com", "head@school.co.ke", "x@uonbi.ac.ke", "a@startup.co", "a@mail.org"])(
    "leaves %s alone",
    (input) => {
      expect(suggestEmailCorrection(input)).toBeNull();
    },
  );

  it("ignores malformed input", () => {
    expect(suggestEmailCorrection("not-an-email")).toBeNull();
    expect(emailTypoMessage("not-an-email")).toBeNull();
  });

  it("builds a friendly message", () => {
    expect(emailTypoMessage("a@gmail.cpm")).toBe("That email looks mistyped. Did you mean a@gmail.com?");
  });
});
