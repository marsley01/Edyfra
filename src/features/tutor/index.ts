/**
 * Tutor Feature
 *
 * Manages tutor profiles, session management, earnings,
 * availability scheduling, and resource publishing.
 *
 * Domain: Tutor
 * Role: TUTOR
 *
 * @packageDocumentation
 */

export const TUTOR_FEATURE = {
  name: "tutor",
  label: "Tutor",
  description: "Tutor profiles, sessions, earnings, availability, and resource publishing",
  minRole: "TUTOR",
} as const;
