// Shared, dependency-free normalisers used by search ranking, tutor matching
// and student discovery. Pure functions only — safe to import from client,
// server and tests.

/** Lowercase, strip accents, collapse whitespace. */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_\s]+/g, " ")
    .trim();
}

// Common spellings students actually type, mapped to one canonical key.
const SUBJECT_ALIASES: Record<string, string> = {
  maths: "mathematics",
  math: "mathematics",
  "math a": "mathematics",
  "mathematics a": "mathematics",
  bio: "biology",
  chem: "chemistry",
  phy: "physics",
  phys: "physics",
  "comp sci": "computer science",
  "computer studies": "computer science",
  cs: "computer science",
  ict: "computer science",
  eng: "english",
  "english language": "english",
  kiswahili: "swahili",
  "kiswahili lugha": "swahili",
  geo: "geography",
  hist: "history",
  "history and government": "history",
  "history & government": "history",
  cre: "religious education",
  ire: "religious education",
  hre: "religious education",
  "business studies": "business",
  bst: "business",
  agric: "agriculture",
};

/** Canonical subject key: "Maths" and "mathematics" compare equal. */
export function subjectKey(subject: string | null | undefined): string {
  const n = normalizeText(subject);
  return SUBJECT_ALIASES[n] ?? n;
}

export function subjectKeySet(subjects: readonly (string | null | undefined)[] | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const s of subjects ?? []) {
    const k = subjectKey(s);
    if (k) out.add(k);
  }
  return out;
}

export type LevelKey = "HIGH_SCHOOL" | "UNIVERSITY";

/**
 * Map stored level values ("HIGH_SCHOOL", "High School", "university",
 * "Form 3", "Grade 10", "Campus") onto the EduLevel enum keys.
 */
export function levelKey(value: string | null | undefined): LevelKey | null {
  const n = normalizeText(value);
  if (!n) return null;
  if (/\b(university|uni|campus|college|undergrad|degree|diploma|year [1-6])\b/.test(n)) {
    return "UNIVERSITY";
  }
  if (/\b(high school|highschool|secondary|form [1-4]|f[1-4]|grade (9|1[0-2])|kcse|senior school|junior school)\b/.test(n)) {
    return "HIGH_SCHOOL";
  }
  return null;
}

/**
 * Normalise a form/grade label: "Form 3", "F3", "form three" -> "form 3";
 * "Grade 10" -> "grade 10". Returns null when nothing recognisable.
 */
export function formKey(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? `form ${value}` : null;
  const n = normalizeText(value)
    .replace(/\bone\b/g, "1")
    .replace(/\btwo\b/g, "2")
    .replace(/\bthree\b/g, "3")
    .replace(/\bfour\b/g, "4");
  const form = n.match(/\b(?:form|f)\s*([1-6])\b/);
  if (form) return `form ${form[1]}`;
  const grade = n.match(/\b(?:grade|g)\s*(\d{1,2})\b/);
  if (grade) return `grade ${Number(grade[1])}`;
  if (/^\d$/.test(n)) return `form ${n}`;
  return null;
}

export type CurriculumKey = "CBC" | "8-4-4" | "IGCSE" | "UNIVERSITY";

export function curriculumKey(value: string | null | undefined): CurriculumKey | null {
  const n = normalizeText(value);
  if (!n) return null;
  if (n.includes("cbc") || n.includes("competency")) return "CBC";
  if (n.includes("844") || n.includes("8-4-4") || n.includes("8 4 4") || n.includes("eight four four") || n.includes("eight_four_four")) return "8-4-4";
  if (n.includes("igcse") || n.includes("cambridge") || n.includes("british")) return "IGCSE";
  if (n.includes("university")) return "UNIVERSITY";
  return null;
}

export function countyKey(value: string | null | undefined): string {
  return normalizeText(value).replace(/\s+county$/, "");
}
