/**
 * Admin Feature
 *
 * Platform administration: user management, moderation,
 * system configuration, analytics, and billing.
 *
 * Domain: Admin
 * Roles: SUPER_ADMIN, FOUNDER
 *
 * @packageDocumentation
 */

export const ADMIN_FEATURE = {
  name: "admin",
  label: "Administration",
  description: "Platform administration, user management, moderation, analytics, and billing",
  minRole: "SUPER_ADMIN",
} as const;
