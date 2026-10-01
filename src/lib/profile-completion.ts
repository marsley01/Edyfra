/**
 * Single source of truth for "has this account finished setting itself up?".
 *
 * The dashboard used to gate on `Boolean(studentProfile || tutorProfile)`. That
 * is a proxy, not a check: a `studentProfile` row created as a stub by an
 * unrelated save passes the gate while the account is still effectively empty,
 * and a `TUTOR`-role user with no profile at all fails it — which combined with
 * the role redirect in `/onboarding/choice` to produce an infinite
 * `/dashboard` <-> `/onboarding/choice` loop for anyone who abandoned the tutor
 * form. Both are fixed by testing the fields that actually matter.
 *
 * Completeness is deliberately independent of admin approval: a tutor who has
 * submitted KYC is "complete" for onboarding purposes even while their
 * application sits in PENDING, otherwise the app would keep nagging a tutor who
 * has done everything in their control.
 */

export type ProfileKind = "STUDENT" | "TUTOR" | "STAFF";

export type ProfileField =
  | "name"
  | "educationLevel"
  | "curriculum"
  | "formYear"
  | "county"
  | "subjects"
  | "weakTopics"
  | "studyStyle"
  | "bio"
  | "levelsTaught"
  | "hourlyRate"
  | "mpesaNumber"
  | "kycDocuments";

export interface ProfileStatus {
  kind: ProfileKind;
  isComplete: boolean;
  /** Fields still missing, in the order they should be asked about. */
  missing: ProfileField[];
  /** 0-100, for progress indicators. */
  percent: number;
  /** Where an incomplete user should be sent to finish. */
  resumePath: string;
}

export interface ProfileStatusInput {
  name?: string | null;
  role?: string | null;
  educationLevel?: string | null;
  curriculum?: string | null;
  formYear?: number | null;
  county?: string | null;
  studentProfile?: {
    subjects?: string[] | null;
    weakTopics?: string[] | null;
    studyStyle?: string | null;
  } | null;
  tutorProfile?: {
    bio?: string | null;
    subjects?: string[] | null;
    levelsTaught?: string[] | null;
    hourlyRate?: number | null;
    mpesaNumber?: string | null;
  } | null;
  tutorApplication?: {
    status?: string | null;
    idPhotoUrl?: string | null;
    selfieUrl?: string | null;
  } | null;
}

const STAFF_ROLES = new Set(["ADMIN", "FOUNDER", "SUPER_ADMIN", "SCHOOL_ADMIN"]);

/** Weights roughly reflect how much the product leans on each answer. */
const STUDENT_REQUIREMENTS: Array<{
  field: ProfileField;
  isMet: (input: ProfileStatusInput) => boolean;
}> = [
  { field: "name", isMet: (i) => Boolean(i.name?.trim()) },
  { field: "educationLevel", isMet: (i) => Boolean(i.educationLevel) },
  { field: "curriculum", isMet: (i) => Boolean(i.curriculum?.trim()) },
  { field: "formYear", isMet: (i) => typeof i.formYear === "number" },
  { field: "county", isMet: (i) => Boolean(i.county?.trim()) },
  { field: "subjects", isMet: (i) => (i.studentProfile?.subjects?.length ?? 0) > 0 },
  { field: "weakTopics", isMet: (i) => (i.studentProfile?.weakTopics?.length ?? 0) > 0 },
  { field: "studyStyle", isMet: (i) => Boolean(i.studentProfile?.studyStyle?.trim()) },
];

const TUTOR_REQUIREMENTS: Array<{
  field: ProfileField;
  isMet: (input: ProfileStatusInput) => boolean;
}> = [
  { field: "name", isMet: (i) => Boolean(i.name?.trim()) },
  { field: "bio", isMet: (i) => (i.tutorProfile?.bio?.trim().length ?? 0) >= 30 },
  { field: "subjects", isMet: (i) => (i.tutorProfile?.subjects?.length ?? 0) > 0 },
  { field: "levelsTaught", isMet: (i) => (i.tutorProfile?.levelsTaught?.length ?? 0) > 0 },
  { field: "hourlyRate", isMet: (i) => (i.tutorProfile?.hourlyRate ?? 0) > 0 },
  { field: "mpesaNumber", isMet: (i) => Boolean(i.tutorProfile?.mpesaNumber?.trim()) },
  {
    field: "kycDocuments",
    isMet: (i) => {
      const application = i.tutorApplication;
      if (!application) return false;
      // Once an admin has looked at it, the documents exist by definition —
      // a REJECTED tutor is handled by the review flow, not by onboarding.
      if (application.status && application.status !== "PENDING") return true;
      return Boolean(application.idPhotoUrl && application.selfieUrl);
    },
  },
];

export function resolveProfileKind(input: ProfileStatusInput): ProfileKind {
  const role = input.role?.toUpperCase() ?? "";
  if (STAFF_ROLES.has(role)) return "STAFF";
  if (role === "TUTOR") return "TUTOR";
  return "STUDENT";
}

export function getProfileStatus(input: ProfileStatusInput): ProfileStatus {
  const kind = resolveProfileKind(input);

  if (kind === "STAFF") {
    return { kind, isComplete: true, missing: [], percent: 100, resumePath: "/dashboard" };
  }

  const requirements = kind === "TUTOR" ? TUTOR_REQUIREMENTS : STUDENT_REQUIREMENTS;
  const missing = requirements.filter((r) => !r.isMet(input)).map((r) => r.field);
  const total = requirements.length;
  const percent = Math.round(((total - missing.length) / total) * 100);

  return {
    kind,
    isComplete: missing.length === 0,
    missing,
    percent,
    resumePath: kind === "TUTOR" ? "/tutor/settings" : "/dashboard/settings",
  };
}

export function isProfileComplete(input: ProfileStatusInput): boolean {
  return getProfileStatus(input).isComplete;
}

/**
 * Whether a user with an incomplete profile is still allowed to keep using the
 * rest of the app. Used to keep the dashboard reachable for a brand-new Google
 * sign-up, who would otherwise be locked out of the very page that lets them
 * finish setting up.
 */
export function isShellUsable(input: ProfileStatusInput): boolean {
  const kind = resolveProfileKind(input);
  if (kind === "STAFF") return true;
  // Any concrete profile row means the app has something to render; only a
  // completely absent profile forces the full onboarding interstitial.
  return Boolean(input.studentProfile || input.tutorProfile);
}

const LABELS: Record<ProfileField, string> = {
  name: "Your name",
  educationLevel: "Education level",
  curriculum: "Curriculum",
  formYear: "Form / grade",
  county: "County",
  subjects: "Subjects you want help with",
  weakTopics: "Topics you find difficult",
  studyStyle: "How you like to study",
  bio: "A short bio (30+ characters)",
  levelsTaught: "Classes you can teach",
  hourlyRate: "Your hourly rate",
  mpesaNumber: "M-Pesa number for payouts",
  kycDocuments: "ID photo and selfie",
};

export function profileFieldLabel(field: ProfileField): string {
  return LABELS[field] ?? field;
}
