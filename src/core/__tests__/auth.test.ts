import { describe, it, expect } from "vitest";
import { Role, isRoleAtLeast, isRoleBelow, getRoleLevel, parseRole, ROLE_HIERARCHY } from "@/core/auth/Roles";
import { hasPermission, hasAllPermissions, getPermissionsForRole } from "@/core/auth/Permissions";
import { AppError } from "@/core/errors";

describe("Roles", () => {
  it("has correct hierarchy", () => {
    expect(ROLE_HIERARCHY[Role.STUDENT]).toBe(0);
    expect(ROLE_HIERARCHY[Role.SUPER_ADMIN]).toBe(4);
    expect(ROLE_HIERARCHY[Role.FOUNDER]).toBe(5);
  });

  it("isRoleAtLeast works correctly", () => {
    expect(isRoleAtLeast(Role.STUDENT, Role.STUDENT)).toBe(true);
    expect(isRoleAtLeast(Role.SUPER_ADMIN, Role.STUDENT)).toBe(true);
    expect(isRoleAtLeast(Role.STUDENT, Role.TUTOR)).toBe(false);
  });

  it("isRoleBelow works correctly", () => {
    expect(isRoleBelow(Role.STUDENT, Role.TUTOR)).toBe(true);
    expect(isRoleBelow(Role.TUTOR, Role.STUDENT)).toBe(false);
  });

  it("getRoleLevel returns numeric level", () => {
    expect(getRoleLevel(Role.STUDENT)).toBe(0);
    expect(getRoleLevel(Role.SUPER_ADMIN)).toBe(4);
    expect(getRoleLevel(Role.FOUNDER)).toBe(5);
  });

  it("parseRole handles valid and invalid roles", () => {
    expect(parseRole("STUDENT")).toBe(Role.STUDENT);
    expect(parseRole("student")).toBe(Role.STUDENT);
    expect(parseRole("INVALID")).toBeNull();
  });
});

describe("Permissions", () => {
  it("student has basic permissions", () => {
    expect(hasPermission(Role.STUDENT, "user:read")).toBe(true);
    expect(hasPermission(Role.STUDENT, "session:create")).toBe(true);
    expect(hasPermission(Role.STUDENT, "system:configure")).toBe(false);
  });

  it("super admin has all permissions", () => {
    expect(hasPermission(Role.SUPER_ADMIN, "user:read")).toBe(true);
    expect(hasPermission(Role.SUPER_ADMIN, "system:configure")).toBe(true);
    expect(hasPermission(Role.SUPER_ADMIN, "billing:read")).toBe(true);
  });

  it("founder has billing write access", () => {
    expect(hasPermission(Role.FOUNDER, "billing:write")).toBe(true);
  });

  it("hasAllPermissions works", () => {
    expect(hasAllPermissions(Role.STUDENT, ["user:read", "session:create"])).toBe(true);
    expect(hasAllPermissions(Role.STUDENT, ["user:read", "system:configure"])).toBe(false);
  });

  it("getPermissionsForRole returns array", () => {
    const studentPerms = getPermissionsForRole(Role.STUDENT);
    expect(studentPerms.length).toBeGreaterThan(0);
    expect(studentPerms).toContain("user:read");
  });
});

describe("AppError", () => {
  it("AppError.unauthorized creates 401 error", () => {
    const error = AppError.unauthorized();
    expect(error.status).toBe(401);
    expect(error.code).toBe("AUTH_UNAUTHORIZED");
  });

  it("AppError.forbidden creates 403 error", () => {
    const error = AppError.forbidden();
    expect(error.status).toBe(403);
  });

  it("AppError.notFound creates 404 error", () => {
    const error = AppError.notFound();
    expect(error.status).toBe(404);
  });

  it("AppError.validation creates 400 error with details", () => {
    const error = AppError.validation("Invalid email", { field: "email" });
    expect(error.status).toBe(400);
    expect(error.details).toEqual({ field: "email" });
  });

  it("AppError.rateLimited creates 429 retryable error", () => {
    const error = AppError.rateLimited();
    expect(error.status).toBe(429);
    expect(error.retryable).toBe(true);
  });

  it("toResponse hides internal details for 500 errors", () => {
    const error = AppError.internal("Sensitive DB error");
    const response = error.toResponse();
    expect(response.error.message).toBe("An unexpected error occurred.");
  });

  it("toResponse shows details for 400 errors", () => {
    const error = AppError.validation("Bad input");
    const response = error.toResponse();
    expect(response.error.message).toBe("Bad input");
  });
});
