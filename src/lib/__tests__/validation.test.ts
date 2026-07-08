import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  emailField,
  passwordField,
  phoneField,
} from "@/lib/validation/schemas";

describe("emailField", () => {
  it("accepts valid email", () => {
    expect(emailField.parse("test@example.com")).toBe("test@example.com");
  });

  it("rejects invalid email", () => {
    expect(() => emailField.parse("not-an-email")).toThrow();
  });

  it("trims and lowercases", () => {
    expect(emailField.parse("  Test@Example.COM ")).toBe("test@example.com");
  });
});

describe("passwordField", () => {
  it("accepts valid password", () => {
    expect(passwordField.parse("Abcdef1g")).toBe("Abcdef1g");
  });

  it("rejects short password", () => {
    expect(() => passwordField.parse("Ab1")).toThrow();
  });

  it("rejects password without uppercase", () => {
    expect(() => passwordField.parse("abcdef1gh")).toThrow();
  });

  it("rejects password without number", () => {
    expect(() => passwordField.parse("Abcdefgh")).toThrow();
  });
});

describe("loginSchema", () => {
  it("accepts valid login", () => {
    const result = loginSchema.parse({
      email: "user@example.com",
      password: "password",
    });
    expect(result.email).toBe("user@example.com");
  });

  it("rejects missing password", () => {
    expect(() =>
      loginSchema.parse({ email: "user@example.com", password: "" }),
    ).toThrow();
  });
});

describe("signupSchema", () => {
  it("accepts valid signup", () => {
    const result = signupSchema.parse({
      name: "John Doe",
      email: "john@example.com",
      password: "Abcdef1g",
      role: "student",
    });
    expect(result.name).toBe("John Doe");
  });

  it("rejects short name", () => {
    expect(() =>
      signupSchema.parse({
        name: "J",
        email: "john@example.com",
        password: "Abcdef1g",
        role: "student",
      }),
    ).toThrow();
  });

  it("rejects invalid role", () => {
    expect(() =>
      signupSchema.parse({
        name: "John Doe",
        email: "john@example.com",
        password: "Abcdef1g",
        role: "invalid",
      }),
    ).toThrow();
  });
});

describe("phoneField", () => {
  it("accepts Kenyan phone", () => {
    expect(phoneField.parse("+254712345678")).toBe("+254712345678");
  });

  it("rejects invalid phone", () => {
    expect(() => phoneField.parse("12345")).toThrow();
  });
});
