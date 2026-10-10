"use server";

// Read-side analytics for the institution portal. Every export checks
// assertInstitutionAdminAccess(institutionId) and scopes every query by that
// institution. The maths lives in src/lib/institution-analytics.ts (pure,
// unit-tested); this file only loads rows and shapes the output.

import { cache } from "react";
import prisma from "@/lib/prisma";
import { assertInstitutionAdminAccess } from "./_institution-access";
import {
  AT_RISK_CONFIG,
  AT_RISK_WEIGHTS,
  COACHING_DEFAULTS,
  KCSE_GRADE_BOUNDARIES,
  atRiskScore,
  compareTerms,
  computeMovers,
  gradeForPoints,
  gradeForScore,
  linearTrend,
  mean,
  parseClassStream,
  rankStudents,
  recommendCoaching,
  round,
  sampleStd,
  subjectDifficulty,
  teacherEffectiveness,
  termIndex,
  termKey,
  termLabel,
  toCsv,
  type CoachingRecommendation,
  type KcseGrade,
  type RankedStudent,
  type SubjectDifficultyRow,
  type TeacherEffectivenessRow,
  type TermRef,
  type UnmatchedNeed,
  type ValueAddedRecord,
} from "@/lib/institution-analytics";

const WINDOW_TERMS = 6; // assessments used for trends
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Loading (internal) ─────────────────────────────────────────────────

interface TermAggregate extends TermRef {
  meanScore: number;
  results: number;
}

/** Every term that has results, oldest first, aggregated in the database. */
const loadTermAggregates = cache(async (institutionId: string): Promise<TermAggregate[]> => {
  const groups = await prisma.studentResult.groupBy({
    by: ["year", "term"],
    where: { institutionId },
    _avg: { marks: true },
    _count: { _all: true },
    orderBy: [{ year: "asc" }, { term: "asc" }],
  });
  return groups.map((g) => ({ term: g.term, year: g.year, meanScore: g._avg.marks ?? 0, results: g._count._all }));
});

/** Requested term if it has results, else the current academic term, else the latest term with results. */
async function resolveFocus(institutionId: string, requested?: TermRef | null) {
  const terms = await loadTermAggregates(institutionId);
  const has = (t: TermRef | null | undefined) => !!t && terms.some((x) => x.term === t.term && x.year === t.year);
  let focus: TermRef | null = null;
  if (has(requested)) focus = { term: requested!.term, year: requested!.year };
  if (!focus) {
    const current = await prisma.academicTerm.findFirst({
      where: { institutionId, isCurrent: true },
      select: { term: true, year: true },
    });
    if (has(current)) focus = current;
  }
  if (!focus && terms.length) focus = { term: terms[terms.length - 1].term, year: terms[terms.length - 1].year };
  const window = focus ? terms.filter((t) => compareTerms(t, focus!) <= 0).slice(-WINDOW_TERMS) : [];
  const previous = window.length >= 2 ? window[window.length - 2] : null;
  return { terms, focus, previous, window };
}

interface StudentTerm {
  subjects: Map<string, { subject: string; marks: number; resultId: string }>; // key = lower(subject)
  mean: number;
  meanPoints: number;
  form: string | null;
}

interface StudentHistory {
  studentId: string;
  name: string;
  admissionNumber: string | null;
  terms: Map<string, StudentTerm>; // termKey → term data
}

/**
 * Loads results for the analysis window in ONE query and folds them per
 * student and term. Duplicate (student, subject, term) rows from older,
 * non-idempotent imports are collapsed to the newest row.
 */
const loadWindow = cache(async (institutionId: string, windowKeys: string) => {
  const window: TermRef[] = windowKeys
    ? windowKeys.split(",").map((k) => {
        const [y, t] = k.split("-T");
        return { year: Number(y), term: Number(t) };
      })
    : [];
  if (window.length === 0) return new Map<string, StudentHistory>();
  const rows = await prisma.studentResult.findMany({
    where: {
      institutionId,
      studentUserId: { not: null },
      OR: window.map((t) => ({ term: t.term, year: t.year })),
    },
    select: {
      id: true,
      studentUserId: true,
      studentName: true,
      admissionNumber: true,
      subject: true,
      marks: true,
      term: true,
      year: true,
      form: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const students = new Map<string, StudentHistory>();
  for (const r of rows) {
    const sid = r.studentUserId!;
    const h = students.get(sid) ?? { studentId: sid, name: r.studentName, admissionNumber: null, terms: new Map() };
    h.name = r.studentName || h.name;
    h.admissionNumber = r.admissionNumber || h.admissionNumber;
    const key = termKey(r);
    const t = h.terms.get(key) ?? { subjects: new Map(), mean: 0, meanPoints: 0, form: null };
    t.subjects.set(r.subject.trim().toLowerCase(), { subject: r.subject.trim(), marks: r.marks, resultId: r.id });
    t.form = r.form || t.form;
    h.terms.set(key, t);
    students.set(sid, h);
  }
  for (const h of students.values()) {
    for (const t of h.terms.values()) {
      const marks = [...t.subjects.values()].map((s) => s.marks);
      t.mean = mean(marks) ?? 0;
      t.meanPoints = mean(marks.map((m) => gradeForScore(m).points)) ?? 0;
    }
  }
  return students;
});

const windowKeyOf = (window: TermRef[]) => window.map(termKey).join(",");

const activeStudentIds = cache(async (institutionId: string) => {
  const members = await prisma.institutionMember.findMany({
    where: { institutionId, role: "INSTITUTION_STUDENT", status: "ACTIVE" },
    select: { userId: true, user: { select: { lastActiveAt: true } } },
  });
  return new Map(members.map((m) => [m.userId, m.user.lastActiveAt]));
});

function parseTermArg(t?: TermRef | null): TermRef | null {
  if (!t) return null;
  const term = Number(t.term);
  const year = Number(t.year);
  if (!Number.isInteger(term) || term < 1 || term > 3 || !Number.isInteger(year)) return null;
  return { term, year };
}

// ─── Overview KPIs ──────────────────────────────────────────────────────

export interface InstitutionKpis {
  focus: TermRef | null;
  focusLabel: string | null;
  previous: TermRef | null;
  previousLabel: string | null;
  availableTerms: { term: number; year: number; label: string }[];
  enrolment: number;
  active7d: number;
  active30d: number;
  assessedStudents: number;
  meanScore: number | null;
  meanScoreDelta: number | null;
  meanPoints: number | null;
  meanGrade: KcseGrade | null;
  meanPointsDelta: number | null;
  subjectMeans: { subject: string; mean: number; students: number; previous: number | null; delta: number | null }[];
  movers: { top: MoverRow[]; bottom: MoverRow[] };
  termSeries: { label: string; meanScore: number; meanPoints: number | null; grade: KcseGrade | null; students: number }[];
  gradeDistribution: { grade: KcseGrade; count: number }[];
}

export interface MoverRow {
  studentId: string;
  name: string;
  previous: number;
  current: number;
  delta: number;
}

export async function getInstitutionKpis(institutionId: string, term?: TermRef | null): Promise<InstitutionKpis> {
  await assertInstitutionAdminAccess(institutionId);
  const t = parseTermArg(term);
  // Memoised per request: the overview renders several sections from one result.
  return computeKpis(institutionId, t ? termKey(t) : "");
}

const computeKpis = cache(async (institutionId: string, requestedKey: string): Promise<InstitutionKpis> => {
  const [y, tt] = requestedKey ? requestedKey.split("-T") : [];
  const requested = requestedKey ? { year: Number(y), term: Number(tt) } : null;
  const { terms, focus, previous, window } = await resolveFocus(institutionId, requested);
  const now = Date.now();

  const [enrolment, active7d, active30d, history, subjectNow, subjectPrev] = await Promise.all([
    prisma.institutionMember.count({ where: { institutionId, role: "INSTITUTION_STUDENT", status: "ACTIVE" } }),
    prisma.institutionMember.count({
      where: {
        institutionId,
        role: "INSTITUTION_STUDENT",
        status: "ACTIVE",
        user: { lastActiveAt: { gte: new Date(now - 7 * DAY_MS) } },
      },
    }),
    prisma.institutionMember.count({
      where: {
        institutionId,
        role: "INSTITUTION_STUDENT",
        status: "ACTIVE",
        user: { lastActiveAt: { gte: new Date(now - 30 * DAY_MS) } },
      },
    }),
    loadWindow(institutionId, windowKeyOf(window)),
    focus
      ? prisma.studentResult.groupBy({
          by: ["subject"],
          where: { institutionId, term: focus.term, year: focus.year },
          _avg: { marks: true },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    previous
      ? prisma.studentResult.groupBy({
          by: ["subject"],
          where: { institutionId, term: previous.term, year: previous.year },
          _avg: { marks: true },
        })
      : Promise.resolve([]),
  ]);

  // Per-term school means of student mean points (KCSE mean grade is a mean of points).
  const pointsByTerm = new Map<string, number[]>();
  for (const h of history.values()) {
    for (const [k, t] of h.terms) {
      const arr = pointsByTerm.get(k) ?? [];
      arr.push(t.meanPoints);
      pointsByTerm.set(k, arr);
    }
  }
  const termPoints = (t: TermRef | null) => (t ? mean(pointsByTerm.get(termKey(t)) ?? []) : null);
  const termAgg = (t: TermRef | null) => (t ? terms.find((x) => x.term === t.term && x.year === t.year) ?? null : null);

  const focusAgg = termAgg(focus);
  const prevAgg = termAgg(previous);
  const focusPts = termPoints(focus);
  const prevPts = termPoints(previous);

  const prevSubj = new Map(subjectPrev.map((s) => [s.subject.trim().toLowerCase(), s._avg.marks ?? null]));
  // Collapse case variants ("maths" / "Maths") into one row, weighted by count.
  const subjAcc = new Map<string, { subject: string; sum: number; n: number }>();
  for (const s of subjectNow) {
    const k = s.subject.trim().toLowerCase();
    const acc = subjAcc.get(k) ?? { subject: s.subject.trim(), sum: 0, n: 0 };
    acc.sum += (s._avg.marks ?? 0) * s._count._all;
    acc.n += s._count._all;
    subjAcc.set(k, acc);
  }
  const subjectMeans = [...subjAcc.entries()]
    .map(([k, a]) => {
      const m = a.sum / a.n;
      const p = prevSubj.get(k) ?? null;
      return { subject: a.subject, mean: round(m, 1), students: a.n, previous: p == null ? null : round(p, 1), delta: p == null ? null : round(m - p, 1) };
    })
    .sort((a, b) => b.mean - a.mean);

  const currentMeans = new Map<string, { name: string; mean: number }>();
  const prevMeans = new Map<string, number>();
  const gradeCounts = new Map<KcseGrade, number>();
  for (const h of history.values()) {
    const cur = focus ? h.terms.get(termKey(focus)) : undefined;
    if (cur) {
      currentMeans.set(h.studentId, { name: h.name, mean: cur.mean });
      const g = gradeForPoints(cur.meanPoints);
      gradeCounts.set(g, (gradeCounts.get(g) ?? 0) + 1);
    }
    const prev = previous ? h.terms.get(termKey(previous)) : undefined;
    if (prev) prevMeans.set(h.studentId, prev.mean);
  }

  return {
    focus,
    focusLabel: focus ? termLabel(focus) : null,
    previous,
    previousLabel: previous ? termLabel(previous) : null,
    availableTerms: [...terms].reverse().map((t) => ({ term: t.term, year: t.year, label: termLabel(t) })),
    enrolment,
    active7d,
    active30d,
    assessedStudents: currentMeans.size,
    meanScore: focusAgg ? round(focusAgg.meanScore, 1) : null,
    meanScoreDelta: focusAgg && prevAgg ? round(focusAgg.meanScore - prevAgg.meanScore, 1) : null,
    meanPoints: focusPts == null ? null : round(focusPts, 2),
    meanGrade: focusPts == null ? null : gradeForPoints(focusPts),
    meanPointsDelta: focusPts != null && prevPts != null ? round(focusPts - prevPts, 2) : null,
    subjectMeans,
    movers: computeMovers(currentMeans, prevMeans, 5),
    termSeries: window.map((t) => {
      const pts = termPoints(t);
      return {
        label: termLabel(t),
        meanScore: round(termAgg(t)?.meanScore ?? 0, 1),
        meanPoints: pts == null ? null : round(pts, 2),
        grade: pts == null ? null : gradeForPoints(pts),
        students: pointsByTerm.get(termKey(t))?.length ?? 0,
      };
    }),
    gradeDistribution: KCSE_GRADE_BOUNDARIES.map((b) => ({ grade: b.grade, count: gradeCounts.get(b.grade) ?? 0 })),
  };
});

// ─── At-risk ────────────────────────────────────────────────────────────

export interface AtRiskRow {
  studentId: string;
  name: string;
  admissionNumber: string | null;
  className: string;
  stream: string | null;
  latestMean: number | null;
  slope: number | null;
  score: number;
  level: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  weakSubjects: { subject: string; score: number }[];
}

/** Risk for every active student assessed in the window (internal, memoised per request). */
const computeRiskTable = cache(async (institutionId: string, focusKey: string, windowKeys: string) => {
  const [history, active] = await Promise.all([loadWindow(institutionId, windowKeys), activeStudentIds(institutionId)]);
  const window = windowKeys.split(",").filter(Boolean);
  const now = Date.now();

  // Class of each student = class at their latest assessed term in the window.
  const classOf = new Map<string, { className: string; stream: string | null }>();
  for (const h of history.values()) {
    for (let i = window.length - 1; i >= 0; i--) {
      const t = h.terms.get(window[i]);
      if (t) {
        classOf.set(h.studentId, parseClassStream(t.form));
        break;
      }
    }
  }

  // Class statistics per term: means of student means, and median papers sat.
  const classTerm = new Map<string, { means: number[]; papers: number[] }>();
  for (const h of history.values()) {
    const cls = classOf.get(h.studentId)!.className;
    for (const [k, t] of h.terms) {
      const key = `${cls}|${k}`;
      const c = classTerm.get(key) ?? { means: [], papers: [] };
      c.means.push(t.mean);
      c.papers.push(t.subjects.size);
      classTerm.set(key, c);
    }
  }
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
  };

  const rows: AtRiskRow[] = [];
  for (const h of history.values()) {
    if (!active.has(h.studentId)) continue; // removed students are not actionable
    const { className, stream } = classOf.get(h.studentId)!;
    const series: number[] = [];
    let expected = 0;
    let completed = 0;
    for (const k of window) {
      const t = h.terms.get(k);
      if (t) series.push(t.mean);
      const c = classTerm.get(`${className}|${k}`);
      if (c) {
        const med = median(c.papers);
        expected += med;
        completed += Math.min(t?.subjects.size ?? 0, med);
      }
    }
    const fit = linearTrend(series, { minPoints: 3, maxPoints: WINDOW_TERMS });
    const latestTerm = h.terms.get(focusKey);
    const cls = classTerm.get(`${className}|${focusKey}`);
    const lastActive = active.get(h.studentId);
    const risk = atRiskScore({
      slope: fit?.slope ?? null,
      latest: latestTerm?.mean ?? null,
      classMean: cls ? mean(cls.means) : null,
      classSd: cls ? sampleStd(cls.means) : null,
      expectedAssessments: expected,
      completedAssessments: completed,
      daysSinceActive: lastActive ? (now - lastActive.getTime()) / DAY_MS : null,
    });
    rows.push({
      studentId: h.studentId,
      name: h.name,
      admissionNumber: h.admissionNumber,
      className,
      stream,
      latestMean: latestTerm ? round(latestTerm.mean, 1) : null,
      slope: fit ? round(fit.slope, 2) : null,
      score: risk.score,
      level: risk.level,
      reasons: risk.reasons,
      weakSubjects: latestTerm
        ? [...latestTerm.subjects.values()]
            .filter((s) => s.marks < 50)
            .sort((a, b) => a.marks - b.marks)
            .map((s) => ({ subject: s.subject, score: s.marks }))
        : [],
    });
  }
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return rows;
});

export interface AtRiskPage {
  focusLabel: string | null;
  rows: AtRiskRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: { HIGH: number; MEDIUM: number; LOW: number };
  weights: { decline: number; belowMean: number; missing: number; inactivity: number };
  thresholds: { high: number; medium: number };
}

export async function getAtRiskStudents(
  institutionId: string,
  opts: { term?: TermRef | null; level?: "HIGH" | "MEDIUM" | "LOW" | "ALL"; page?: number; pageSize?: number } = {},
): Promise<AtRiskPage> {
  await assertInstitutionAdminAccess(institutionId);
  const { focus, window } = await resolveFocus(institutionId, parseTermArg(opts.term));
  const pageSize = Math.min(100, Math.max(5, Math.floor(opts.pageSize ?? 20)));
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const all = focus ? await computeRiskTable(institutionId, termKey(focus), windowKeyOf(window)) : [];
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const r of all) counts[r.level]++;
  const level = opts.level ?? "ALL";
  const filtered =
    level === "ALL" ? all.filter((r) => r.level !== "LOW") : all.filter((r) => r.level === level);
  return {
    focusLabel: focus ? termLabel(focus) : null,
    rows: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize,
    counts,
    weights: { ...AT_RISK_WEIGHTS },
    thresholds: { high: AT_RISK_CONFIG.high, medium: AT_RISK_CONFIG.medium },
  };
}

// ─── Value-added: subject difficulty + teacher effectiveness ────────────

/** Teachers of each (subject, class): active teachers only. */
async function loadTeacherAssignments(institutionId: string) {
  const [assignments, teachers] = await Promise.all([
    prisma.teacherSubjectAssignment.findMany({
      where: { institutionId },
      select: { teacherUserId: true, subject: true, formYear: true },
    }),
    prisma.institutionMember.findMany({
      where: { institutionId, role: "INSTITUTION_TEACHER", status: "ACTIVE" },
      select: { userId: true, user: { select: { name: true } } },
    }),
  ]);
  const names = new Map(teachers.map((t) => [t.userId, t.user.name]));
  const live = assignments.filter((a) => names.has(a.teacherUserId));
  const formMatches = (formYear: string | null, className: string) => {
    if (!formYear) return true;
    const parsed = parseClassStream(formYear).className.toLowerCase();
    return parsed === className.toLowerCase() || formYear.trim().toLowerCase() === className.toLowerCase();
  };
  const teachersFor = (subject: string, className: string) =>
    live
      .filter((a) => a.subject.trim().toLowerCase() === subject.trim().toLowerCase() && formMatches(a.formYear, className))
      .map((a) => a.teacherUserId);
  return { live, names, teachersFor };
}

export interface ValueAddedReport {
  focusLabel: string | null;
  priorLabel: string | null;
  recordsWithPrior: number;
  subjects: SubjectDifficultyRow[];
  teachers: (TeacherEffectivenessRow & { name: string })[];
}

export async function getValueAddedReport(institutionId: string, term?: TermRef | null): Promise<ValueAddedReport> {
  await assertInstitutionAdminAccess(institutionId);
  const { focus, previous, window } = await resolveFocus(institutionId, parseTermArg(term));
  if (!focus) return { focusLabel: null, priorLabel: null, recordsWithPrior: 0, subjects: [], teachers: [] };
  const [history, ta] = await Promise.all([loadWindow(institutionId, windowKeyOf(window)), loadTeacherAssignments(institutionId)]);
  const records = buildValueAddedRecords(history, focus, previous, ta.teachersFor);
  const teachers = teacherEffectiveness(records, { minN: 5 }).map((t) => ({ ...t, name: ta.names.get(t.teacherId) ?? "Teacher" }));
  return {
    focusLabel: termLabel(focus),
    priorLabel: previous ? termLabel(previous) : null,
    recordsWithPrior: records.filter((r) => r.priorMean != null).length,
    subjects: subjectDifficulty(records, { minN: 5 }),
    teachers,
  };
}

function buildValueAddedRecords(
  history: Map<string, StudentHistory>,
  focus: TermRef,
  previous: TermRef | null,
  teachersFor: (subject: string, className: string) => string[],
): ValueAddedRecord[] {
  const records: ValueAddedRecord[] = [];
  for (const h of history.values()) {
    const cur = h.terms.get(termKey(focus));
    if (!cur) continue;
    const prior = previous ? h.terms.get(termKey(previous))?.mean ?? null : null;
    const { className } = parseClassStream(cur.form);
    for (const s of cur.subjects.values()) {
      records.push({
        studentId: h.studentId,
        subject: s.subject,
        score: s.marks,
        priorMean: prior,
        teacherIds: teachersFor(s.subject, className),
      });
    }
  }
  return records;
}

// ─── Rankings ───────────────────────────────────────────────────────────

export interface RankingRow extends Omit<RankedStudent, "form"> {
  admissionNumber: string | null;
  subjectMarks: Record<string, number>;
}

export interface RankingPage {
  focusLabel: string | null;
  focus: TermRef | null;
  classes: { className: string; streams: string[]; students: number }[];
  subjects: string[];
  rows: RankingRow[];
  total: number;
  page: number;
  pageSize: number;
}

async function buildRanking(institutionId: string, term: TermRef | null) {
  const { focus, window } = await resolveFocus(institutionId, term);
  if (!focus) return { focus: null, ranked: [] as RankingRow[], subjects: [] as string[] };
  const history = await loadWindow(institutionId, windowKeyOf(window));
  const inputs = [];
  const points = new Map<string, number>();
  const extra = new Map<string, { admissionNumber: string | null; subjectMarks: Record<string, number> }>();
  const subjectSet = new Map<string, string>();
  for (const h of history.values()) {
    const t = h.terms.get(termKey(focus));
    if (!t) continue;
    inputs.push({ studentId: h.studentId, name: h.name, form: t.form, mean: t.mean, subjects: t.subjects.size });
    points.set(h.studentId, t.meanPoints);
    const marks: Record<string, number> = {};
    for (const s of t.subjects.values()) {
      const k = s.subject.toLowerCase();
      if (!subjectSet.has(k)) subjectSet.set(k, s.subject);
      marks[subjectSet.get(k)!] = s.marks;
    }
    extra.set(h.studentId, { admissionNumber: h.admissionNumber, subjectMarks: marks });
  }
  const ranked = rankStudents(inputs, points).map<RankingRow>(({ form: _form, ...r }) => ({
    ...r,
    mean: round(r.mean, 2),
    ...extra.get(r.studentId)!,
  }));
  return { focus, ranked, subjects: [...subjectSet.values()].sort((a, b) => a.localeCompare(b)) };
}

export async function getClassRankings(
  institutionId: string,
  opts: { term?: TermRef | null; className?: string | null; stream?: string | null; search?: string | null; page?: number; pageSize?: number } = {},
): Promise<RankingPage> {
  await assertInstitutionAdminAccess(institutionId);
  const { focus, ranked, subjects } = await buildRanking(institutionId, parseTermArg(opts.term));
  const classMap = new Map<string, { streams: Set<string>; students: number }>();
  for (const r of ranked) {
    const c = classMap.get(r.className) ?? { streams: new Set(), students: 0 };
    if (r.stream) c.streams.add(r.stream);
    c.students++;
    classMap.set(r.className, c);
  }
  const q = opts.search?.trim().toLowerCase() ?? "";
  const filtered = ranked.filter(
    (r) =>
      (!opts.className || r.className === opts.className) &&
      (!opts.stream || r.stream === opts.stream) &&
      (!q || r.name.toLowerCase().includes(q) || (r.admissionNumber ?? "").toLowerCase().includes(q)),
  );
  // Within a single class, order by class position.
  if (opts.className) filtered.sort((a, b) => a.classRank - b.classRank || a.name.localeCompare(b.name));
  const pageSize = Math.min(200, Math.max(10, Math.floor(opts.pageSize ?? 25)));
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  return {
    focusLabel: focus ? termLabel(focus) : null,
    focus,
    classes: [...classMap.entries()]
      .map(([className, c]) => ({ className, streams: [...c.streams].sort(), students: c.students }))
      .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true })),
    subjects,
    rows: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

/** CSV of class results with positions. Returns the file contents for the browser to download. */
export async function exportClassResultsCsv(
  institutionId: string,
  opts: { term?: TermRef | null; className?: string | null; stream?: string | null } = {},
): Promise<{ ok: true; filename: string; csv: string } | { ok: false; error: string }> {
  await assertInstitutionAdminAccess(institutionId);
  const { focus, ranked, subjects } = await buildRanking(institutionId, parseTermArg(opts.term));
  if (!focus) return { ok: false, error: "There are no results to export yet." };
  const rows = ranked
    .filter((r) => (!opts.className || r.className === opts.className) && (!opts.stream || r.stream === opts.stream))
    .sort((a, b) => (opts.className ? a.classRank - b.classRank : a.overallRank - b.overallRank) || a.name.localeCompare(b.name));
  if (rows.length === 0) return { ok: false, error: "No students match that class." };
  const headers = [
    "Overall position",
    "Class position",
    "Stream position",
    "Admission no.",
    "Name",
    "Class",
    "Stream",
    ...subjects,
    "Papers",
    "Mean score",
    "Mean points",
    "Mean grade",
    "Percentile",
  ];
  const body = rows.map((r) => [
    `${r.overallRank}/${r.overallOf}`,
    `${r.classRank}/${r.classOf}`,
    r.streamRank != null ? `${r.streamRank}/${r.streamOf}` : "",
    r.admissionNumber ?? "",
    r.name,
    r.className,
    r.stream ?? "",
    ...subjects.map((s) => r.subjectMarks[s] ?? null),
    r.subjects,
    r.mean,
    r.meanPoints,
    r.meanGrade,
    r.percentile,
  ]);
  const scope = [opts.className, opts.stream].filter(Boolean).join("-") || "all-classes";
  const filename = `results-${focus.year}-term${focus.term}-${scope}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() + ".csv";
  return { ok: true, filename, csv: toCsv(headers, body) };
}

/** One student's marks for a term, for the single-mark editor. */
export async function getStudentTermMarks(institutionId: string, studentUserId: string, term: TermRef) {
  await assertInstitutionAdminAccess(institutionId);
  const t = parseTermArg(term);
  if (!t) return [];
  const rows = await prisma.studentResult.findMany({
    where: { institutionId, studentUserId, term: t.term, year: t.year },
    select: { id: true, subject: true, marks: true, grade: true },
    orderBy: [{ subject: "asc" }, { createdAt: "desc" }],
  });
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = r.subject.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─── Coaching recommendations ───────────────────────────────────────────

export interface CoachingRecommendationReport {
  focusLabel: string | null;
  capacity: number;
  recommendations: CoachingRecommendation[];
  unmatched: UnmatchedNeed[];
  teacherLoad: { teacherId: string; name: string; active: number; recommended: number }[];
}

export async function getCoachingRecommendations(institutionId: string, term?: TermRef | null): Promise<CoachingRecommendationReport> {
  await assertInstitutionAdminAccess(institutionId);
  const capacity = COACHING_DEFAULTS.capacity;
  const { focus, previous, window } = await resolveFocus(institutionId, parseTermArg(term));
  if (!focus) return { focusLabel: null, capacity, recommendations: [], unmatched: [], teacherLoad: [] };

  const [risk, history, ta, loads, existing] = await Promise.all([
    computeRiskTable(institutionId, termKey(focus), windowKeyOf(window)),
    loadWindow(institutionId, windowKeyOf(window)),
    loadTeacherAssignments(institutionId),
    prisma.coachingAssignment.groupBy({
      by: ["teacherUserId"],
      where: { institutionId, status: { in: ["ACTIVE", "SCHEDULED"] } },
      _count: { _all: true },
    }),
    prisma.coachingAssignment.findMany({
      where: { institutionId, status: { in: ["ACTIVE", "SCHEDULED"] } },
      select: { studentUserId: true, subject: true },
    }),
  ]);

  const effectiveness = new Map(
    teacherEffectiveness(buildValueAddedRecords(history, focus, previous, ta.teachersFor), { minN: 5 }).map((t) => [
      t.teacherId,
      t.effectivenessZ,
    ]),
  );
  const loadMap = new Map(loads.map((l) => [l.teacherUserId, l._count._all]));
  const teacherMap = new Map<string, { subjects: Set<string>; forms: Set<string> }>();
  for (const a of ta.live) {
    const t = teacherMap.get(a.teacherUserId) ?? { subjects: new Set(), forms: new Set() };
    t.subjects.add(a.subject);
    if (a.formYear) t.forms.add(parseClassStream(a.formYear).className);
    teacherMap.set(a.teacherUserId, t);
  }
  const teachers = [...teacherMap.entries()].map(([teacherId, t]) => ({
    teacherId,
    name: ta.names.get(teacherId) ?? "Teacher",
    subjects: [...t.subjects],
    forms: [...t.forms],
    activeLoad: loadMap.get(teacherId) ?? 0,
    effectivenessZ: effectiveness.get(teacherId) ?? null,
  }));
  const students = risk
    .filter((r) => r.level !== "LOW" && r.weakSubjects.length > 0)
    .map((r) => ({ studentId: r.studentId, name: r.name, className: r.className, riskScore: r.score, subjects: r.weakSubjects }));

  const { recommendations, unmatched } = recommendCoaching(students, teachers, {
    capacity,
    existing: new Set(existing.map((e) => `${e.studentUserId}|${e.subject}`)),
  });
  const recCount = new Map<string, number>();
  for (const r of recommendations) recCount.set(r.teacherId, (recCount.get(r.teacherId) ?? 0) + 1);
  return {
    focusLabel: termLabel(focus),
    capacity,
    recommendations,
    unmatched,
    teacherLoad: teachers
      .map((t) => ({ teacherId: t.teacherId, name: t.name, active: t.activeLoad, recommended: recCount.get(t.teacherId) ?? 0 }))
      .sort((a, b) => b.active + b.recommended - (a.active + a.recommended)),
  };
}

/** Terms with results, newest first, for term pickers. */
export async function getResultTerms(institutionId: string) {
  await assertInstitutionAdminAccess(institutionId);
  const terms = await loadTermAggregates(institutionId);
  return [...terms]
    .sort((a, b) => termIndex(b) - termIndex(a))
    .map((t) => ({ term: t.term, year: t.year, label: termLabel(t), results: t.results }));
}
