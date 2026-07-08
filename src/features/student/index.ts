/**
 * Student Feature
 *
 * Manages student profiles, study sessions, tutor matching,
 * resource access, achievements, and gamification.
 *
 * Domain: Student
 * Role: STUDENT
 *
 * @packageDocumentation
 */

export const STUDENT_FEATURE = {
  name: "student",
  label: "Student",
  description: "Student profiles, sessions, matching, resources, and gamification",
  minRole: "STUDENT",
} as const;
