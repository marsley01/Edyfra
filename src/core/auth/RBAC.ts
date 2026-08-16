import { Role, isRoleAtLeast, getRoleLevel } from "./Roles";
import { hasPermission, hasAllPermissions, type Permission } from "./Permissions";
import { AppError } from "@/core/errors";

export interface RBACUser {
  id: string;
  role: Role;
  institutionId?: string;
}

export class RBAC {
  static check(user: RBACUser, permission: Permission): void {
    if (!hasPermission(user.role, permission)) {
      throw AppError.forbidden(
        `Missing required permission: ${permission}. Your role (${user.role}) does not have this access.`,
      );
    }
  }

  static checkAll(user: RBACUser, permissions: Permission[]): void {
    if (!hasAllPermissions(user.role, permissions)) {
      const missing = permissions.filter((p) => !hasPermission(user.role, p));
      throw AppError.forbidden(
        `Missing permissions: ${missing.join(", ")}. Required for this action.`,
      );
    }
  }

  static requireRole(user: RBACUser, minimumRole: Role): void {
    if (!isRoleAtLeast(user.role, minimumRole)) {
      throw AppError.forbidden(
        `This action requires at least ${minimumRole} role. Your role: ${user.role}.`,
      );
    }
  }

  static requireExactRole(user: RBACUser, requiredRole: Role): void {
    if (user.role !== requiredRole) {
      throw AppError.forbidden(
        `This action requires exactly ${requiredRole} role. Your role: ${user.role}.`,
      );
    }
  }

  static requireInstitutionAccess(user: RBACUser, institutionId: string): void {
    if (user.role === Role.SUPER_ADMIN || user.role === Role.FOUNDER) return;
    if (user.institutionId !== institutionId) {
      throw AppError.forbidden("You do not have access to this institution.");
    }
  }

  static isAdmin(user: RBACUser): boolean {
    return isRoleAtLeast(user.role, Role.SUPER_ADMIN);
  }

  static isSchoolStaff(user: RBACUser): boolean {
    return [Role.SCHOOL_ADMIN, Role.LIBRARIAN, Role.TUTOR].includes(user.role);
  }

  static canImpersonate(impersonator: RBACUser, targetRole: Role): boolean {
    return getRoleLevel(impersonator.role) > getRoleLevel(targetRole);
  }

  static getRoleLevel(user: RBACUser): number {
    return getRoleLevel(user.role);
  }
}
