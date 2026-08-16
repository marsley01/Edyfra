import { Role, ROLE_HIERARCHY } from "./Roles";

export type Permission =
  | "user:read"
  | "user:write"
  | "user:delete"
  | "tutor:read"
  | "tutor:approve"
  | "tutor:suspend"
  | "student:read"
  | "student:write"
  | "session:create"
  | "session:read"
  | "session:moderate"
  | "resource:create"
  | "resource:read"
  | "resource:publish"
  | "resource:delete"
  | "library:manage"
  | "institution:read"
  | "institution:write"
  | "institution:manage"
  | "payment:read"
  | "payment:refund"
  | "analytics:read"
  | "analytics:export"
  | "moderation:read"
  | "moderation:act"
  | "system:configure"
  | "system:logs"
  | "system:users"
  | "feature:manage"
  | "billing:read"
  | "billing:write";

export type PermissionMap = Partial<Record<Role, Permission[]>>;

export const DEFAULT_PERMISSIONS: PermissionMap = {
  [Role.STUDENT]: [
    "user:read",
    "user:write",
    "session:create",
    "session:read",
    "resource:read",
    "resource:create",
  ],
  [Role.TUTOR]: [
    "user:read",
    "user:write",
    "session:create",
    "session:read",
    "resource:read",
    "resource:create",
    "resource:publish",
    "tutor:read",
  ],
  [Role.LIBRARIAN]: [
    "user:read",
    "resource:read",
    "resource:create",
    "resource:publish",
    "resource:delete",
    "library:manage",
  ],
  [Role.SCHOOL_ADMIN]: [
    "user:read",
    "user:write",
    "student:read",
    "student:write",
    "tutor:read",
    "tutor:approve",
    "session:read",
    "session:moderate",
    "resource:read",
    "institution:read",
    "institution:write",
    "institution:manage",
    "analytics:read",
    "analytics:export",
    "moderation:read",
  ],
  [Role.SUPER_ADMIN]: [
    "user:read",
    "user:write",
    "user:delete",
    "tutor:read",
    "tutor:approve",
    "tutor:suspend",
    "student:read",
    "student:write",
    "session:read",
    "session:moderate",
    "resource:read",
    "resource:publish",
    "resource:delete",
    "library:manage",
    "institution:read",
    "institution:write",
    "institution:manage",
    "payment:read",
    "payment:refund",
    "analytics:read",
    "analytics:export",
    "moderation:read",
    "moderation:act",
    "system:configure",
    "system:logs",
    "system:users",
    "feature:manage",
    "billing:read",
  ],
  [Role.FOUNDER]: [
    "user:read",
    "user:write",
    "user:delete",
    "tutor:read",
    "tutor:approve",
    "tutor:suspend",
    "student:read",
    "student:write",
    "session:create",
    "session:read",
    "session:moderate",
    "resource:create",
    "resource:read",
    "resource:publish",
    "resource:delete",
    "library:manage",
    "institution:read",
    "institution:write",
    "institution:manage",
    "payment:read",
    "payment:refund",
    "analytics:read",
    "analytics:export",
    "moderation:read",
    "moderation:act",
    "system:configure",
    "system:logs",
    "system:users",
    "feature:manage",
    "billing:read",
    "billing:write",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = DEFAULT_PERMISSIONS[role];
  if (!permissions) return false;
  if (permissions.includes(permission)) return true;

  const roleLevel = ROLE_HIERARCHY[role];
  for (const [r, perms] of Object.entries(DEFAULT_PERMISSIONS) as [Role, Permission[]][]) {
    if (ROLE_HIERARCHY[r] <= roleLevel && perms.includes(permission)) {
      return true;
    }
  }

  return false;
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function getPermissionsForRole(role: Role): Permission[] {
  const direct = DEFAULT_PERMISSIONS[role] || [];

  const inherited: Set<Permission> = new Set(direct);
  const roleLevel = ROLE_HIERARCHY[role];

  for (const [r, perms] of Object.entries(DEFAULT_PERMISSIONS) as [Role, Permission[]][]) {
    if (ROLE_HIERARCHY[r] < roleLevel) {
      for (const p of perms) {
        inherited.add(p);
      }
    }
  }

  return Array.from(inherited);
}
