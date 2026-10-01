/**
 * Option lists shared by the onboarding wizard and the "finish your profile"
 * panel in settings. Both write into the same `studentProfile` / `User` columns,
 * so letting the two drift would mean a value the wizard accepts is rejected as
 * incomplete by the completeness check.
 */

export const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Kiswahili",
  "Geography",
  "History",
  "Computer Science",
  "Business",
] as const;

export const COUNTIES = [
  "Nairobi",
  "Mombasa",
  "Nakuru",
  "Kisumu",
  "Uasin Gishu",
  "Kiambu",
  "Machakos",
  "Kakamega",
  "Meru",
  "Nyeri",
  "Kisii",
  "Trans Nzoia",
  "Bungoma",
  "Kilifi",
] as const;

export const STUDY_STYLES = [
  { value: "visual", label: "Visual" },
  { value: "auditory", label: "Auditory" },
  { value: "group", label: "Group" },
  { value: "solo", label: "Solo" },
] as const;

export const CURRICULUMS = [
  { value: "8-4-4", label: "8-4-4" },
  { value: "CBC", label: "CBC" },
] as const;

/**
 * Kenyan school system: 8-4-4 high school is Form 1-4, CBC senior school is
 * Grade 9-12, university is Year 1-6.
 */
export function getYearOptions(
  educationLevel: string,
  curriculum: string,
): Array<{ value: string; label: string }> {
  if (educationLevel === "UNIVERSITY") {
    return [1, 2, 3, 4, 5, 6].map((y) => ({ value: String(y), label: `Year ${y}` }));
  }
  if (curriculum === "CBC") {
    return [9, 10, 11, 12].map((y) => ({ value: String(y), label: `Grade ${y}` }));
  }
  return [1, 2, 3, 4].map((y) => ({ value: String(y), label: `Form ${y}` }));
}
