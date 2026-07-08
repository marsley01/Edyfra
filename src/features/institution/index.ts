/**
 * Institution Feature
 *
 * Manages school/organization profiles, student enrollment,
 * academic results, teacher coordination, and holiday coaching.
 *
 * Domain: Institution
 * Roles: SCHOOL_ADMIN, TEACHER
 *
 * @packageDocumentation
 */

export const INSTITUTION_FEATURE = {
  name: "institution",
  label: "Institution",
  description: "School profiles, enrollment, results, teacher coordination, and coaching",
  minRole: "SCHOOL_ADMIN",
} as const;
