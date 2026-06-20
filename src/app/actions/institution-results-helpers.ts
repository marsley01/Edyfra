import Papa from "papaparse";
import { z } from "zod";

export interface ParsedCsv {
  columns: string[];
  rows: Record<string, string>[];
  error?: string;
}

export function parseResultsCsv(text: string): Promise<ParsedCsv> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const cols = results.meta.fields ?? [];
        if (cols.length === 0) {
          resolve({ columns: [], rows: [], error: "CSV has no columns" });
          return;
        }
        resolve({
          columns: cols,
          rows: results.data,
          error: results.errors[0]?.message,
        });
      },
      error: (err: Error) => resolve({ columns: [], rows: [], error: err.message }),
    });
  });
}

export interface ColumnMapping {
  admissionNumber: string | null;
  studentName: string | null;
  subject: string | null;
  marks: string | null;
  grade: string | null;
  term: string | null;
  year: string | null;
  form: string | null;
}

const COLUMN_HINTS: Record<keyof ColumnMapping, RegExp[]> = {
  admissionNumber: [/adm(?:ission)?[_\s-]?(?:no|number|#)?$/i, /^adm/i, /student[_\s-]?id$/i],
  studentName: [/student[_\s-]?name$/i, /^name$/i, /pupil[_\s-]?name$/i, /learner[_\s-]?name$/i],
  subject: [/^subject$/i, /course/i, /unit/i],
  marks: [/^(score|mark|grade[_\s-]?score)$/i, /^marks?$/i, /total[_\s-]?mark/i],
  grade: [/^grade$/i, /letter[_\s-]?grade/i],
  term: [/^term$/i, /semester/i, /^t\d$/i],
  year: [/^year$/i, /academic[_\s-]?year/i, /^y\d{4}$/i],
  form: [/^form$/i, /class[_\s-]?form/i, /^grade[_\s-]?\d/i, /stream/i],
};

export function suggestMapping(columns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    admissionNumber: null,
    studentName: null,
    subject: null,
    marks: null,
    grade: null,
    term: null,
    year: null,
    form: null,
  };
  for (const col of columns) {
    for (const key of Object.keys(COLUMN_HINTS) as (keyof ColumnMapping)[]) {
      if (mapping[key]) continue;
      if (COLUMN_HINTS[key].some((re) => re.test(col))) {
        mapping[key] = col;
        break;
      }
    }
  }
  return mapping;
}

const RowSchema = z.object({
  admissionNumber: z.string().max(60),
  studentName: z.string().min(1).max(160),
  subject: z.string().min(1).max(60),
  marks: z.coerce.number().min(0).max(100),
  grade: z.string().max(8).nullable().optional(),
  term: z.coerce.number().int().min(1).max(3),
  year: z.coerce.number().int().min(2020).max(2099),
  form: z.string().min(1).max(40),
});

export type ValidatedRow = z.infer<typeof RowSchema>;

export interface ValidationIssue {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  validCount: number;
  invalidCount: number;
  issues: ValidationIssue[];
  preview: ValidatedRow[];
  allValid: ValidatedRow[];
}

const KNOWN_SUBJECTS = new Set([
  "mathematics", "maths", "math", "english", "kiswahili", "swahili",
  "science", "biology", "chemistry", "physics", "geography", "history",
  "cre", "ire", "hre", "social studies", "agriculture", "business",
  "computer", "computer studies", "french", "german", "arabic",
  "music", "art", "physical education", "pe", "home science",
]);

export function validateResultsRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): ValidationResult {
  const preview: ValidatedRow[] = [];
  const allValid: ValidatedRow[] = [];
  const issues: ValidationIssue[] = [];
  let validCount = 0;
  let invalidCount = 0;

  const required: (keyof ColumnMapping)[] = [
    "admissionNumber", "studentName", "subject", "marks", "term", "year", "form",
  ];
  for (const r of required) {
    if (!mapping[r]) {
      issues.push({ row: 0, field: r, message: `Column "${r}" is not mapped` });
    }
  }
  if (issues.length > 0) {
    return { validCount: 0, invalidCount: rows.length, issues, preview: [], allValid: [] };
  }

  rows.forEach((row, idx) => {
    const get = (k: keyof ColumnMapping): string => (mapping[k] ? String(row[mapping[k]!] ?? "").trim() : "");

    const data = {
      admissionNumber: get("admissionNumber"),
      studentName: get("studentName"),
      subject: get("subject"),
      marks: get("marks") as unknown as number,
      grade: get("grade") || null,
      term: get("term") as unknown as number,
      year: get("year") as unknown as number,
      form: get("form"),
    };

    const parsed = RowSchema.safeParse(data);
    if (!parsed.success) {
      invalidCount++;
      for (const i of parsed.error.issues) {
        issues.push({ row: idx + 2, field: i.path.join(".") || "row", message: i.message });
      }
      return;
    }

    if (parsed.data.marks > 100 || parsed.data.marks < 0) {
      invalidCount++;
      issues.push({ row: idx + 2, field: "marks", message: `Marks must be 0-100, got ${parsed.data.marks}` });
      return;
    }

    if (parsed.data.subject && !KNOWN_SUBJECTS.has(parsed.data.subject.toLowerCase().trim())) {
      issues.push({
        row: idx + 2,
        field: "subject",
        message: `Unknown subject "${parsed.data.subject}" — will still import but check spelling`,
      });
    }

    validCount++;
    allValid.push(parsed.data);
    if (preview.length < 10) preview.push(parsed.data);
  });

  return { validCount, invalidCount, issues: issues.slice(0, 50), preview, allValid };
}
