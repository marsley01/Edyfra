export enum Role {
  STUDENT = "STUDENT",
  TUTOR = "TUTOR",
  LIBRARIAN = "LIBRARIAN",
  SCHOOL_ADMIN = "SCHOOL_ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
  FOUNDER = "FOUNDER",
}

export const ALL_ROLES = Object.values(Role);

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.STUDENT]: 0,
  [Role.TUTOR]: 1,
  [Role.LIBRARIAN]: 2,
  [Role.SCHOOL_ADMIN]: 3,
  [Role.SUPER_ADMIN]: 4,
  [Role.FOUNDER]: 5,
};

export const ROLE_LABELS: Record<Role, string> = {
  [Role.STUDENT]: "Student",
  [Role.TUTOR]: "Tutor",
  [Role.LIBRARIAN]: "Librarian",
  [Role.SCHOOL_ADMIN]: "School Admin",
  [Role.SUPER_ADMIN]: "Super Admin",
  [Role.FOUNDER]: "Founder",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [Role.STUDENT]: "Can access study resources, join study rooms, request tutoring",
  [Role.TUTOR]: "Can create study sessions, publish resources, earn revenue",
  [Role.LIBRARIAN]: "Can manage digital library resources and catalog",
  [Role.SCHOOL_ADMIN]: "Can manage institution, students, teachers, and reports",
  [Role.SUPER_ADMIN]: "Full platform access, user management, system configuration",
  [Role.FOUNDER]: "Ultimate access, billing, platform settings",
};

export function isRoleAtLeast(userRole: Role, minimumRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

export function isRoleBelow(userRole: Role, thresholdRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[thresholdRole];
}

export function getRoleLevel(role: Role): number {
  return ROLE_HIERARCHY[role];
}

export function parseRole(value: string): Role | null {
  const upper = value.toUpperCase() as Role;
  return ALL_ROLES.includes(upper) ? upper : null;
}
