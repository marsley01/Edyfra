/**
 * Library Feature
 *
 * Digital library management: cataloging, resource organization,
 * access control, and metadata management.
 *
 * Domain: Library
 * Roles: LIBRARIAN, SCHOOL_ADMIN, SUPER_ADMIN
 *
 * @packageDocumentation
 */

export const LIBRARY_FEATURE = {
  name: "library",
  label: "Digital Library",
  description: "Digital library cataloging, resource management, and access control",
  minRole: "LIBRARIAN",
} as const;
