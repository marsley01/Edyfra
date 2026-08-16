import { describe, it, expect } from "vitest";
import { AuthError, ValidationError, NotFoundError, handleActionError } from "@/lib/auth";

describe("AuthError", () => {
  it("creates error with correct name", () => {
    const error = new AuthError("Not authorized");
    expect(error.name).toBe("AuthError");
    expect(error.message).toBe("Not authorized");
  });
});

describe("ValidationError", () => {
  it("creates error with fields", () => {
    const error = new ValidationError("Invalid input", { email: "Required" });
    expect(error.name).toBe("ValidationError");
    expect(error.fields).toEqual({ email: "Required" });
  });
});

describe("NotFoundError", () => {
  it("creates error with default message", () => {
    const error = new NotFoundError();
    expect(error.message).toBe("Resource not found");
  });

  it("creates error with custom message", () => {
    const error = new NotFoundError("User not found");
    expect(error.message).toBe("User not found");
  });
});

describe("handleActionError", () => {
  it("handles AuthError", () => {
    const result = handleActionError(new AuthError("Login required"));
    expect(result).toEqual({ error: "Login required" });
  });

  it("handles ValidationError", () => {
    const result = handleActionError(new ValidationError("Bad input"));
    expect(result).toEqual({ error: "Bad input" });
  });

  it("handles NotFoundError", () => {
    const result = handleActionError(new NotFoundError());
    expect(result).toEqual({ error: "Resource not found" });
  });

  it("handles unknown errors", () => {
    const result = handleActionError(new Error("Something broke"));
    expect(result).toEqual({
      error: "An unexpected error occurred. Please try again.",
    });
  });

  it("handles non-Error thrown values", () => {
    const result = handleActionError("raw string");
    expect(result).toEqual({
      error: "An unexpected error occurred. Please try again.",
    });
  });
});
