// Pure analytics for the institution (school) portal.
//
// Everything here is deterministic and side-effect free: no Prisma, no
// "use server". Server actions load rows, call these functions, and render
// the output. Covered by src/lib/__tests__/institution-analytics.test.ts.

// ─── Basic statistics ───────────────────────────────────────────────────

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

/** Sample standard deviation (n − 1). Null when fewer than two values. */
export function sampleStd(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values)!;
  let ss = 0;
  for (const v of values) ss += (v - m) ** 2;
  return Math.sqrt(ss / (values.length - 1));
}

export function round(value: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// ─── KCSE 12-point grading ──────────────────────────────────────────────

export type KcseGrade = "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D" | "D-" | "E";

/**
 * KCSE-style grade boundaries on a 0–100 subject score (lower bound inclusive)
 * and the points each grade carries (A = 12 … E = 1).
 */
export const KCSE_GRADE_BOUNDARIES: readonly { grade: KcseGrade; min: number; points: number }[] = [
  { grade: "A", min: 80, points: 12 },
  { grade: "A-", min: 75, points: 11 },
  { grade: "B+", min: 70, points: 10 },
  { grade: "B", min: 65, points: 9 },
  { grade: "B-", min: 60, points: 8 },
  { grade: "C+", min: 55, points: 7 },
  { grade: "C", min: 50, points: 6 },
  { grade: "C-", min: 45, points: 5 },
  { grade: "D+", min: 40, points: 4 },
  { grade: "D", min: 35, points: 3 },
  { grade: "D-", min: 30, points: 2 },
  { grade: "E", min: 0, points: 1 },
] as const;

/** Grade + points for one subject score. */
export function gradeForScore(score: number): { grade: KcseGrade; points: number } {
  for (const b of KCSE_GRADE_BOUNDARIES) {
    if (score >= b.min) return { grade: b.grade, points: b.points };
  }
  return { grade: "E", points: 1 };
}

/** Letter grade for a mean-points value (rounded half-up to the nearest point). */
export function gradeForPoints(meanPoints: number): KcseGrade {
  const p = Math.min(12, Math.max(1, Math.floor(meanPoints + 0.5)));
  return KCSE_GRADE_BOUNDARIES.find((b) => b.points === p)!.grade;
}

/**
 * KCSE mean grade for a set of subject scores: each score is converted to
 * points, the points are averaged, and the average is mapped back to a grade.
 * (Averaging points, not marks, is how KNEC computes mean grade.)
 */
export function meanGrade(scores: readonly number[]): { meanPoints: number; grade: KcseGrade } | null {
  if (scores.length === 0) return null;
  const pts = scores.map((s) => gradeForScore(s).points);
  const meanPoints = mean(pts)!;
  return { meanPoints: round(meanPoints, 3), grade: gradeForPoints(meanPoints) };
}

// ─── Terms ──────────────────────────────────────────────────────────────

export interface TermRef {
  term: number; // 1..3
  year: number;
}

/** Monotonic index so terms can be compared and differenced. */
export const termIndex = (t: TermRef) => t.year * 3 + (t.term - 1);
export const termKey = (t: TermRef) => `${t.year}-T${t.term}`;
export const termLabel = (t: TermRef) => `Term ${t.term} ${t.year}`;
export const compareTerms = (a: TermRef, b: TermRef) => termIndex(a) - termIndex(b);

export function previousTerm(t: TermRef): TermRef {
  return t.term === 1 ? { term: 3, year: t.year - 1 } : { term: t.term - 1, year: t.year };
}

// ─── Per-student trend (least squares) ──────────────────────────────────

export interface TrendFit {
  slope: number; // score points per assessment
  intercept: number;
  r2: number;
  n: number;
}

/**
 * Ordinary least-squares line through the last `maxPoints` assessment means
 * (x = 0, 1, 2 … in chronological order).
 *
 *   slope = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²
 *
 * Returns null when there are fewer than `minPoints` assessments: two points
 * always fit a perfect line and say nothing about a trend.
 */
export function linearTrend(
  values: readonly number[],
  opts: { minPoints?: number; maxPoints?: number } = {},
): TrendFit | null {
  const minPoints = Math.max(2, opts.minPoints ?? 3);
  const maxPoints = opts.maxPoints ?? 6;
  const ys = values.slice(-maxPoints);
  const n = ys.length;
  if (n < minPoints) return null;
  const xBar = (n - 1) / 2;
  const yBar = mean(ys)!;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - xBar) * (ys[i] - yBar);
    sxx += (i - xBar) ** 2;
    syy += (ys[i] - yBar) ** 2;
  }
  const slope = sxy / sxx;
  const intercept = yBar - slope * xBar;
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2, n };
}

// ─── At-risk score ──────────────────────────────────────────────────────

export const AT_RISK_WEIGHTS = {
  decline: 0.3, // negative trend slope
  belowMean: 0.35, // latest score far below the class mean
  missing: 0.2, // missing assessments
  inactivity: 0.15, // low platform activity
} as const;

export const AT_RISK_CONFIG = {
  /** A slope of −SLOPE_SATURATION points/assessment or worse scores the full decline weight. */
  slopeSaturation: 5,
  /** Latest score must be more than k standard deviations below the class mean. */
  k: 1,
  /** Days without platform activity before inactivity starts counting / saturates. */
  inactiveGraceDays: 7,
  inactiveFullDays: 30,
  high: 60,
  medium: 35,
} as const;

export interface AtRiskInput {
  /** Least-squares slope over recent assessments, or null when too little data. */
  slope: number | null;
  /** Student's latest assessment mean. */
  latest: number | null;
  classMean: number | null;
  classSd: number | null;
  /** Assessments the student should have sat (e.g. subjects × terms on record for their class). */
  expectedAssessments: number;
  completedAssessments: number;
  /** Days since last platform activity; null = never active. */
  daysSinceActive: number | null;
}

export interface AtRiskResult {
  score: number; // 0..100
  level: "HIGH" | "MEDIUM" | "LOW";
  components: { decline: number; belowMean: number; missing: number; inactivity: number }; // each 0..1
  reasons: string[];
}

/**
 * Weighted at-risk score in [0, 100]:
 *
 *   score = 100 × (0.30·decline + 0.35·belowMean + 0.20·missing + 0.15·inactivity)
 *
 *   decline    = clamp(−slope / 5, 0, 1)                       (0 when slope ≥ 0 or unknown)
 *   belowMean  = z < −k ? clamp(−z / 2k, 0, 1) : 0,  z = (latest − classMean) / classSd
 *   missing    = clamp(1 − completed / expected, 0, 1)
 *   inactivity = never active → 1, else clamp((days − 7) / (30 − 7), 0, 1)
 *
 * HIGH ≥ 60, MEDIUM ≥ 35, otherwise LOW. Every non-zero component adds a
 * human-readable reason.
 */
export function atRiskScore(input: AtRiskInput, weights = AT_RISK_WEIGHTS): AtRiskResult {
  const c = AT_RISK_CONFIG;
  const reasons: string[] = [];

  const decline = input.slope != null && input.slope < 0 ? clamp01(-input.slope / c.slopeSaturation) : 0;
  if (decline > 0) reasons.push(`Scores falling by ${round(-input.slope!, 1)} marks per assessment`);

  let belowMean = 0;
  if (input.latest != null && input.classMean != null && input.classSd != null && input.classSd > 0) {
    const z = (input.latest - input.classMean) / input.classSd;
    if (z < -c.k) {
      belowMean = clamp01(-z / (2 * c.k));
      reasons.push(
        `Latest mean ${round(input.latest, 1)} is ${round(-z, 1)} SD below the class mean of ${round(input.classMean, 1)}`,
      );
    }
  }

  let missing = 0;
  if (input.expectedAssessments > 0) {
    missing = clamp01(1 - input.completedAssessments / input.expectedAssessments);
    if (missing > 0) {
      const gap = input.expectedAssessments - input.completedAssessments;
      reasons.push(`${gap} of ${input.expectedAssessments} expected assessment${input.expectedAssessments === 1 ? "" : "s"} missing`);
    }
  }

  let inactivity: number;
  if (input.daysSinceActive == null) {
    inactivity = 1;
    reasons.push("Has never been active on Edyfra");
  } else {
    inactivity = clamp01((input.daysSinceActive - c.inactiveGraceDays) / (c.inactiveFullDays - c.inactiveGraceDays));
    if (inactivity > 0) reasons.push(`Inactive on Edyfra for ${Math.floor(input.daysSinceActive)} days`);
  }

  const score = round(
    100 *
      (weights.decline * decline +
        weights.belowMean * belowMean +
        weights.missing * missing +
        weights.inactivity * inactivity),
    1,
  );
  const level = score >= c.high ? "HIGH" : score >= c.medium ? "MEDIUM" : "LOW";
  return { score, level, components: { decline, belowMean, missing, inactivity }, reasons };
}

// ─── Value-added: subject difficulty + teacher effectiveness ────────────

export interface ValueAddedRecord {
  studentId: string;
  subject: string;
  score: number;
  /** The student's previous-term mean across all subjects (prior attainment). */
  priorMean: number | null;
  teacherId?: string | null;
}

export interface PriorModel {
  intercept: number;
  slope: number;
  n: number;
}

/**
 * Fits score = a + b·priorMean by least squares over every record that has a
 * prior. With fewer than 3 such records, or no spread in priors, falls back
 * to a flat model (b = 0, a = mean score) so residuals become plain deviations.
 */
export function fitPriorModel(records: readonly ValueAddedRecord[]): PriorModel | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of records) {
    if (r.priorMean == null) continue;
    xs.push(r.priorMean);
    ys.push(r.score);
  }
  if (xs.length === 0) return null;
  const xBar = mean(xs)!;
  const yBar = mean(ys)!;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - xBar) * (ys[i] - yBar);
    sxx += (xs[i] - xBar) ** 2;
  }
  if (xs.length < 3 || sxx === 0) return { intercept: yBar, slope: 0, n: xs.length };
  const slope = sxy / sxx;
  return { intercept: yBar - slope * xBar, slope, n: xs.length };
}

export interface SubjectDifficultyRow {
  subject: string;
  n: number;
  rawMean: number;
  /** Mean of (score − expected from prior attainment). Negative = students under-perform here. */
  meanResidual: number;
  /** Standardised across subjects; higher = harder. Null when too few subjects to compare. */
  difficultyZ: number | null;
  label: "HARDER" | "TYPICAL" | "EASIER";
}

/**
 * Subject difficulty controlling for prior attainment.
 *
 *   residual_i   = score_i − (a + b·prior_i)
 *   meanRes_s    = mean of residuals in subject s
 *   difficultyZ_s = −(meanRes_s − mean(meanRes)) / sd(meanRes)
 *
 * A subject is HARDER when z ≥ 1, EASIER when z ≤ −1. Subjects with fewer than
 * `minN` records with a prior are omitted.
 */
export function subjectDifficulty(
  records: readonly ValueAddedRecord[],
  opts: { minN?: number } = {},
): SubjectDifficultyRow[] {
  const minN = opts.minN ?? 5;
  const model = fitPriorModel(records);
  if (!model) return [];
  const bySubject = new Map<string, { scores: number[]; residuals: number[] }>();
  for (const r of records) {
    const b = bySubject.get(r.subject) ?? { scores: [], residuals: [] };
    b.scores.push(r.score);
    if (r.priorMean != null) b.residuals.push(r.score - (model.intercept + model.slope * r.priorMean));
    bySubject.set(r.subject, b);
  }
  const rows = [...bySubject.entries()]
    .filter(([, b]) => b.residuals.length >= minN)
    .map(([subject, b]) => ({ subject, n: b.residuals.length, rawMean: mean(b.scores)!, meanResidual: mean(b.residuals)! }));
  const m = mean(rows.map((r) => r.meanResidual));
  const sd = sampleStd(rows.map((r) => r.meanResidual));
  return rows
    .map<SubjectDifficultyRow>((r) => {
      const z = m != null && sd != null && sd > 0 ? -(r.meanResidual - m) / sd : null;
      return {
        subject: r.subject,
        n: r.n,
        rawMean: round(r.rawMean, 1),
        meanResidual: round(r.meanResidual, 2),
        difficultyZ: z == null ? null : round(z, 2),
        label: z == null ? "TYPICAL" : z >= 1 ? "HARDER" : z <= -1 ? "EASIER" : "TYPICAL",
      };
    })
    .sort((a, b) => (b.difficultyZ ?? 0) - (a.difficultyZ ?? 0));
}

export interface TeacherEffectivenessRow {
  teacherId: string;
  n: number;
  /** Mean value-added in marks, after removing prior attainment and subject difficulty. */
  valueAdded: number;
  standardError: number | null;
  /** Standardised across teachers; positive = students beat expectation. */
  effectivenessZ: number | null;
  /** |valueAdded / SE| ≥ 2: the effect is unlikely to be noise. */
  significant: boolean;
}

/**
 * Teacher effectiveness as value-added.
 *
 *   adj_i       = residual_i − meanRes_{subject(i)}   (removes subject difficulty)
 *   VA_t        = mean(adj_i for records taught by t),  SE_t = sd(adj) / √n
 *   effZ_t      = (VA_t − mean(VA)) / sd(VA)
 *
 * Teachers with fewer than `minN` records are omitted; z is null when fewer
 * than two teachers qualify.
 */
export function teacherEffectiveness(
  records: readonly ValueAddedRecord[],
  opts: { minN?: number } = {},
): TeacherEffectivenessRow[] {
  const minN = opts.minN ?? 5;
  const model = fitPriorModel(records);
  if (!model) return [];
  const withPrior = records.filter((r) => r.priorMean != null);
  const residualOf = (r: ValueAddedRecord) => r.score - (model.intercept + model.slope * r.priorMean!);
  const subjRes = new Map<string, number[]>();
  for (const r of withPrior) {
    const arr = subjRes.get(r.subject) ?? [];
    arr.push(residualOf(r));
    subjRes.set(r.subject, arr);
  }
  const subjMean = new Map([...subjRes.entries()].map(([s, a]) => [s, mean(a)!]));

  const byTeacher = new Map<string, number[]>();
  for (const r of withPrior) {
    if (!r.teacherId) continue;
    const arr = byTeacher.get(r.teacherId) ?? [];
    arr.push(residualOf(r) - (subjMean.get(r.subject) ?? 0));
    byTeacher.set(r.teacherId, arr);
  }
  const rows = [...byTeacher.entries()]
    .filter(([, a]) => a.length >= minN)
    .map(([teacherId, a]) => {
      const va = mean(a)!;
      const sd = sampleStd(a);
      const se = sd != null ? sd / Math.sqrt(a.length) : null;
      return { teacherId, n: a.length, va, se };
    });
  const m = mean(rows.map((r) => r.va));
  const sd = sampleStd(rows.map((r) => r.va));
  return rows
    .map<TeacherEffectivenessRow>((r) => ({
      teacherId: r.teacherId,
      n: r.n,
      valueAdded: round(r.va, 2),
      standardError: r.se == null ? null : round(r.se, 2),
      effectivenessZ: m != null && sd != null && sd > 0 ? round((r.va - m) / sd, 2) : null,
      significant: r.se != null && r.se > 0 ? Math.abs(r.va / r.se) >= 2 : false,
    }))
    .sort((a, b) => b.valueAdded - a.valueAdded);
}

// ─── Ranking ────────────────────────────────────────────────────────────

/**
 * Standard competition ranking ("1224"): equal values share a rank and the
 * next rank skips. Higher value = better. Values are compared at `dp`
 * decimal places so floating-point noise never splits a tie.
 */
export function competitionRanks<T>(items: readonly T[], value: (t: T) => number, dp = 2): Map<T, number> {
  const keyed = items.map((item) => ({ item, v: round(value(item), dp) }));
  keyed.sort((a, b) => b.v - a.v);
  const out = new Map<T, number>();
  let rank = 0;
  for (let i = 0; i < keyed.length; i++) {
    if (i === 0 || keyed[i].v !== keyed[i - 1].v) rank = i + 1;
    out.set(keyed[i].item, rank);
  }
  return out;
}

/** Percentile rank: 100 × (below + ½·equal) / N. */
export function percentileRank(value: number, all: readonly number[], dp = 2): number {
  if (all.length === 0) return 0;
  const v = round(value, dp);
  let below = 0;
  let equal = 0;
  for (const x of all) {
    const r = round(x, dp);
    if (r < v) below++;
    else if (r === v) equal++;
  }
  return round((100 * (below + 0.5 * equal)) / all.length, 1);
}

/** Splits "Form 3 East", "3E", "Grade 7 Blue", "F2-North" into class + stream. */
export function parseClassStream(raw: string | null | undefined): { className: string; stream: string | null } {
  const s = (raw ?? "").trim();
  if (!s) return { className: "Unassigned", stream: null };
  const m = s.match(/^(form|grade|year|class|std|standard|f|g)?\s*\.?\s*(\d{1,2})\s*[-/ ]?\s*([A-Za-z][A-Za-z ]*)?$/i);
  if (!m) return { className: s, stream: null };
  const prefixRaw = (m[1] ?? "form").toLowerCase();
  const prefix =
    prefixRaw === "grade" || prefixRaw === "g"
      ? "Grade"
      : prefixRaw === "year"
        ? "Year"
        : prefixRaw === "class" || prefixRaw === "std" || prefixRaw === "standard"
          ? "Class"
          : "Form";
  const stream = m[3]?.trim() ? m[3].trim().replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  return { className: `${prefix} ${Number(m[2])}`, stream };
}

export interface RankInput {
  studentId: string;
  name: string;
  form: string | null;
  mean: number;
  subjects: number;
}

export interface RankedStudent extends RankInput {
  className: string;
  stream: string | null;
  meanPoints: number;
  meanGrade: KcseGrade;
  overallRank: number;
  overallOf: number;
  classRank: number;
  classOf: number;
  streamRank: number | null;
  streamOf: number | null;
  percentile: number;
}

/**
 * Ranks students by mean score with competition ranking at three levels:
 * school-wide, within class (e.g. Form 3) and within stream (Form 3 East).
 * `pointsByStudent` supplies KCSE mean points (computed per subject upstream).
 */
export function rankStudents(
  students: readonly RankInput[],
  pointsByStudent: ReadonlyMap<string, number>,
): RankedStudent[] {
  const all = students.map((s) => ({ ...s, ...parseClassStream(s.form) }));
  const overall = competitionRanks(all, (s) => s.mean);
  const means = all.map((s) => s.mean);

  const group = <K extends string>(key: (s: (typeof all)[number]) => K | null) => {
    const groups = new Map<string, typeof all>();
    for (const s of all) {
      const k = key(s);
      if (k == null) continue;
      const g = groups.get(k) ?? [];
      g.push(s);
      groups.set(k, g);
    }
    const ranks = new Map<(typeof all)[number], { rank: number; of: number }>();
    for (const g of groups.values()) {
      const r = competitionRanks(g, (s) => s.mean);
      for (const s of g) ranks.set(s, { rank: r.get(s)!, of: g.length });
    }
    return ranks;
  };
  const byClass = group((s) => s.className);
  const byStream = group((s) => (s.stream ? `${s.className}|${s.stream}` : null));

  return all
    .map<RankedStudent>((s) => {
      const pts = pointsByStudent.get(s.studentId) ?? gradeForScore(s.mean).points;
      return {
        ...s,
        meanPoints: round(pts, 3),
        meanGrade: gradeForPoints(pts),
        overallRank: overall.get(s)!,
        overallOf: all.length,
        classRank: byClass.get(s)!.rank,
        classOf: byClass.get(s)!.of,
        streamRank: byStream.get(s)?.rank ?? null,
        streamOf: byStream.get(s)?.of ?? null,
        percentile: percentileRank(s.mean, means),
      };
    })
    .sort((a, b) => a.overallRank - b.overallRank || a.name.localeCompare(b.name));
}

// ─── Movers ─────────────────────────────────────────────────────────────

export interface Mover {
  studentId: string;
  name: string;
  previous: number;
  current: number;
  delta: number;
}

/** Students with the largest rise and fall in mean between two terms. */
export function computeMovers(
  current: ReadonlyMap<string, { name: string; mean: number }>,
  previous: ReadonlyMap<string, number>,
  limit = 5,
): { top: Mover[]; bottom: Mover[] } {
  const movers: Mover[] = [];
  for (const [id, cur] of current) {
    const prev = previous.get(id);
    if (prev == null) continue;
    movers.push({ studentId: id, name: cur.name, previous: round(prev, 1), current: round(cur.mean, 1), delta: round(cur.mean - prev, 1) });
  }
  const top = movers.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, limit);
  const bottom = movers.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, limit);
  return { top, bottom };
}

// ─── Coaching recommendations ───────────────────────────────────────────

export interface CoachingStudentInput {
  studentId: string;
  name: string;
  className: string | null;
  riskScore: number;
  /** Subject scores for the latest term. */
  subjects: { subject: string; score: number }[];
}

export interface CoachingTeacherInput {
  teacherId: string;
  name: string;
  subjects: string[];
  /** Class/form labels the teacher is assigned to (empty = any). */
  forms: string[];
  /** Active + scheduled coaching assignments already held. */
  activeLoad: number;
  effectivenessZ?: number | null;
}

export interface CoachingRecommendation {
  studentId: string;
  studentName: string;
  subject: string;
  studentScore: number;
  teacherId: string;
  teacherName: string;
  reason: string;
}

export interface UnmatchedNeed {
  studentId: string;
  studentName: string;
  subject: string;
  reason: string;
}

export const COACHING_DEFAULTS = {
  capacity: 6, // max concurrent coaching students per teacher
  maxSubjectsPerStudent: 2,
  weakThreshold: 50, // subject score below this is a weak subject
} as const;

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Greedy capacity-constrained matching of at-risk students to teachers.
 *
 * Students are served in descending risk order. For each of a student's weakest
 * subjects (score < weakThreshold, worst first, at most maxSubjectsPerStudent),
 * candidates are teachers of that subject with spare capacity; each is scored
 *
 *   fit = 1.0·[teaches the student's class] + 0.5·effectivenessZ − 1.0·(load / capacity)
 *
 * and the best fit is assigned (ties → fewer current students, then name).
 * Pairs already being coached (`existing`, keyed "studentId|subject") are skipped.
 */
export function recommendCoaching(
  students: readonly CoachingStudentInput[],
  teachers: readonly CoachingTeacherInput[],
  opts: {
    capacity?: number;
    maxSubjectsPerStudent?: number;
    weakThreshold?: number;
    existing?: ReadonlySet<string>;
  } = {},
): { recommendations: CoachingRecommendation[]; unmatched: UnmatchedNeed[] } {
  const capacity = opts.capacity ?? COACHING_DEFAULTS.capacity;
  const maxSubj = opts.maxSubjectsPerStudent ?? COACHING_DEFAULTS.maxSubjectsPerStudent;
  const weak = opts.weakThreshold ?? COACHING_DEFAULTS.weakThreshold;
  const existing = new Set([...(opts.existing ?? [])].map((k) => k.toLowerCase()));
  const load = new Map(teachers.map((t) => [t.teacherId, t.activeLoad]));

  const recommendations: CoachingRecommendation[] = [];
  const unmatched: UnmatchedNeed[] = [];
  const ordered = [...students].sort((a, b) => b.riskScore - a.riskScore || a.name.localeCompare(b.name));

  for (const s of ordered) {
    const needs = s.subjects
      .filter((x) => x.score < weak && !existing.has(`${s.studentId}|${x.subject}`.toLowerCase()))
      .sort((a, b) => a.score - b.score)
      .slice(0, maxSubj);
    for (const need of needs) {
      const candidates = teachers.filter(
        (t) => t.subjects.some((sub) => norm(sub) === norm(need.subject)) && (load.get(t.teacherId) ?? 0) < capacity,
      );
      if (candidates.length === 0) {
        const anyTeacher = teachers.some((t) => t.subjects.some((sub) => norm(sub) === norm(need.subject)));
        unmatched.push({
          studentId: s.studentId,
          studentName: s.name,
          subject: need.subject,
          reason: anyTeacher ? "Every teacher of this subject is at capacity" : "No teacher is assigned to this subject",
        });
        continue;
      }
      const classMatch = (t: CoachingTeacherInput) =>
        s.className != null && t.forms.some((f) => norm(s.className!).includes(norm(f)) || norm(f).includes(norm(s.className!)));
      const fit = (t: CoachingTeacherInput) =>
        (classMatch(t) ? 1 : 0) + 0.5 * (t.effectivenessZ ?? 0) - (load.get(t.teacherId) ?? 0) / capacity;
      candidates.sort(
        (a, b) =>
          fit(b) - fit(a) || (load.get(a.teacherId) ?? 0) - (load.get(b.teacherId) ?? 0) || a.name.localeCompare(b.name),
      );
      const best = candidates[0];
      load.set(best.teacherId, (load.get(best.teacherId) ?? 0) + 1);
      const why = [`${need.subject} at ${round(need.score, 1)}%`];
      if (classMatch(best)) why.push(`teaches ${s.className}`);
      if ((best.effectivenessZ ?? 0) > 0.5) why.push("strong value-added record");
      recommendations.push({
        studentId: s.studentId,
        studentName: s.name,
        subject: need.subject,
        studentScore: round(need.score, 1),
        teacherId: best.teacherId,
        teacherName: best.name,
        reason: why.join(" · "),
      });
    }
  }
  return { recommendations, unmatched };
}

// ─── CSV ────────────────────────────────────────────────────────────────

/**
 * RFC 4180 CSV. Text cells starting with = + - @ (or tab/CR) are prefixed with
 * an apostrophe so spreadsheet apps don't execute them as formulas.
 */
export function toCsv(headers: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const cell = (v: string | number | null | undefined) => {
    if (v == null) return "";
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
    let s = v;
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

/** Key used to make results imports idempotent. */
export function resultKey(r: { studentUserId: string; subject: string; term: number; year: number }): string {
  return `${r.studentUserId}|${norm(r.subject)}|${r.year}|${r.term}`;
}
