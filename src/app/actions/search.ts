"use server";

// Finding students and tutors. Every function here:
//   - requires a signed-in, non-banned viewer and excludes the viewer
//   - excludes banned / suspended users (and unverified tutors)
//   - returns PUBLIC fields only (never email, phone, M-Pesa / payout numbers)
// Ranking lives in pure modules under src/lib/matching (unit tested).

import prisma from "@/lib/prisma";
import { Prisma, Role, EduLevel } from "@/generated/client";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { withRateLimit } from "@/lib/rate-limit";
import { normalizeText, subjectKey, countyKey, levelKey } from "@/lib/matching/normalize";
import { paginate, queryFingerprint, scoreSearchCandidate } from "@/lib/matching/search-rank";
import { rankTutors } from "@/lib/matching/tutor-ranking";
import { rankPeers, recencyScore } from "@/lib/matching/student-discovery";
import { loadTutorCandidates } from "./match-engine";

/** "Online" for students = active in the last few minutes. */
const ONLINE_WINDOW_MS = 5 * 60_000;
/** Max rows pulled from the DB before ranking; pages are cut from the ranked list. */
const CANDIDATE_CAP = 300;

export type PersonRole = "STUDENT" | "TUTOR";

export interface PersonResult {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string;
  role: PersonRole;
  county: string | null;
  level: string | null;
  form: string | null;
  school: string | null;
  subjects: string[];
  isOnline: boolean;
  tutor: { rating: number | null; reviewCount: number; hourlyRate: number | null; verified: boolean } | null;
  matchedOn: string | null;
}

export interface SearchPeopleInput {
  query?: string;
  role?: PersonRole | "ALL";
  subject?: string;
  level?: EduLevel | "ALL";
  county?: string;
  onlineOnly?: boolean;
  cursor?: string | null;
  limit?: number;
}

export interface SearchPage<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
  error?: string;
}

const avatarFor = (id: string, avatar: string | null) =>
  avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(id)}`;

const LEVEL_LABEL: Record<string, string> = { HIGH_SCHOOL: "High School", UNIVERSITY: "University" };

async function getViewer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const viewer = await prisma.user.findFirst({
    where: { OR: [{ id: user.id }, ...(user.email ? [{ email: user.email }] : [])] },
    select: {
      id: true,
      role: true,
      banned: true,
      suspended: true,
      educationLevel: true,
      formYear: true,
      curriculum: true,
      county: true,
      lastActiveAt: true,
      studentProfile: { select: { subjects: true, formLevel: true } },
      tutorProfile: { select: { subjects: true, levelsTaught: true } },
    },
  });
  if (!viewer || viewer.banned || viewer.suspended) return null;
  return viewer;
}

function cleanString(v: unknown, max = 80): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function likePattern(s: string): string {
  return `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** User ids whose student/tutor subjects contain any of the needles (case-insensitive). */
async function userIdsBySubject(needles: string[]): Promise<string[]> {
  const pats = Array.from(new Set(needles.map((n) => n.trim()).filter((n) => n.length >= 2))).map(likePattern);
  if (pats.length === 0) return [];
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT sp."userId" AS id FROM "StudentProfile" sp
     WHERE EXISTS (SELECT 1 FROM unnest(sp."subjects") s WHERE s ILIKE ANY(${pats}::text[]))
    UNION
    SELECT tp."userId" AS id FROM "TutorProfile" tp
     WHERE EXISTS (SELECT 1 FROM unnest(tp."subjects") s WHERE s ILIKE ANY(${pats}::text[]))
    LIMIT 1000`;
  return rows.map((r) => r.id);
}

/** Search needles for a subject, including its canonical alias ("maths" -> "mathematics"). */
function subjectNeedles(s: string): string[] {
  const out = [s];
  const key = subjectKey(s);
  if (key && key !== normalizeText(s)) out.push(key);
  return out;
}

const personSelect = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  role: true,
  county: true,
  educationLevel: true,
  formYear: true,
  lastActiveAt: true,
  studentProfile: { select: { subjects: true, formLevel: true } },
  tutorProfile: { select: { subjects: true, levelsTaught: true, hourlyRate: true, isVerified: true, availability: true } },
  institutionStudent: { select: { institution: { select: { name: true } } } },
} satisfies Prisma.UserSelect;

type PersonRow = Prisma.UserGetPayload<{ select: typeof personSelect }>;

/**
 * One search for students and tutors.
 * Case-insensitive over name, username, subjects, school, level/form and
 * county; ranked exact > prefix > contains; filters for role, subject, level,
 * county and online; cursor pagination.
 */
export async function searchPeople(input: SearchPeopleInput = {}): Promise<SearchPage<PersonResult>> {
  const viewer = await getViewer();
  if (!viewer) return { items: [], nextCursor: null, total: 0, error: "Please sign in to search." };

  const query = cleanString(input.query, 80);
  const role = input.role === "STUDENT" || input.role === "TUTOR" ? input.role : "ALL";
  const subject = cleanString(input.subject, 60);
  const level = input.level === "HIGH_SCHOOL" || input.level === "UNIVERSITY" ? input.level : null;
  const county = cleanString(input.county, 40);
  const onlineOnly = input.onlineOnly === true;
  const hasFilter = role !== "ALL" || !!subject || !!level || !!county || onlineOnly;
  if (query.length < 2 && !hasFilter) return { items: [], nextCursor: null, total: 0 };

  const limited = await withRateLimit(
    "searchPeople",
    viewer.id,
    async () => {
      const and: Prisma.UserWhereInput[] = [
        { id: { not: viewer.id } },
        { banned: false },
        { suspended: false },
        role === "ALL"
          ? { OR: [{ role: Role.STUDENT }, { role: Role.TUTOR, tutorProfile: { isVerified: true } }] }
          : role === "TUTOR"
            ? { role: Role.TUTOR, tutorProfile: { isVerified: true } }
            : { role: Role.STUDENT },
      ];

      if (subject) {
        const ids = await userIdsBySubject(subjectNeedles(subject));
        and.push({ id: { in: ids } });
      }
      if (level) {
        and.push({ OR: [{ educationLevel: level }, { tutorProfile: { levelsTaught: { has: level } } }] });
      }
      if (county) {
        and.push({ county: { contains: countyKey(county), mode: "insensitive" } });
      }
      if (onlineOnly) {
        and.push({
          OR: [
            { lastActiveAt: { gte: new Date(Date.now() - ONLINE_WINDOW_MS) } },
            { tutorProfile: { availability: { path: ["isOnline"], equals: true } } },
          ],
        });
      }
      if (query.length >= 2) {
        const textOr: Prisma.UserWhereInput[] = [
          { name: { contains: query, mode: "insensitive" } },
          { username: { contains: query.replace(/^@/, ""), mode: "insensitive" } },
          { county: { contains: query, mode: "insensitive" } },
          { studentProfile: { formLevel: { contains: query, mode: "insensitive" } } },
          { institutionStudent: { institution: { name: { contains: query, mode: "insensitive" } } } },
        ];
        const lk = levelKey(query);
        if (lk) textOr.push({ educationLevel: lk as EduLevel });
        const words = normalizeText(query).split(" ").filter((w) => w.length >= 2);
        const subjectIds = await userIdsBySubject([...subjectNeedles(query), ...(words.length > 1 ? words : [])]);
        if (subjectIds.length) textOr.push({ id: { in: subjectIds } });
        if (words.length > 1) {
          for (const w of words) {
            textOr.push({ name: { contains: w, mode: "insensitive" } });
            textOr.push({ county: { contains: w, mode: "insensitive" } });
          }
        }
        and.push({ OR: textOr });
      }

      const rows = await prisma.user.findMany({
        where: { AND: and },
        select: personSelect,
        take: CANDIDATE_CAP,
        orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { id: "asc" }],
      });

      const tutorIds = rows.filter((r) => r.role === Role.TUTOR).map((r) => r.id);
      const reviews = tutorIds.length
        ? await prisma.review.groupBy({
            by: ["revieweeId"],
            where: { revieweeId: { in: tutorIds } },
            _avg: { rating: true },
            _count: { _all: true },
          })
        : [];
      const reviewMap = new Map(reviews.map((r) => [r.revieweeId, r]));

      const now = new Date();
      const ranked: { id: string; score: number; person: PersonResult }[] = [];
      for (const r of rows) {
        const person = toPerson(r, now, reviewMap.get(r.id));
        const avg = person.tutor?.rating ?? 0;
        const boost =
          (person.isOnline ? 0.5 : 0) +
          0.3 * recencyScore(r.lastActiveAt, now) +
          (person.tutor ? 0.2 * (avg / 5) : 0);
        if (query.length >= 2) {
          const s = scoreSearchCandidate(
            {
              id: r.id,
              name: r.name,
              username: r.username,
              subjects: person.subjects,
              school: person.school,
              levels: [person.level, person.form, ...(r.tutorProfile?.levelsTaught ?? []).map((l) => LEVEL_LABEL[l] ?? l)],
              county: r.county,
            },
            query,
            boost,
          );
          if (!s) continue;
          person.matchedOn = s.matchedOn;
          ranked.push({ id: r.id, score: s.score, person });
        } else {
          ranked.push({ id: r.id, score: boost, person });
        }
      }
      ranked.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

      const fp = queryFingerprint({ query: normalizeText(query), role, subject, level, county, onlineOnly });
      const page = paginate(ranked, input.cursor, input.limit ?? 20, fp);
      return { items: page.items.map((x) => x.person), nextCursor: page.nextCursor, total: ranked.length };
    },
    { interval: 60_000, maxRequests: 60 },
  );

  if (!limited.success) return { items: [], nextCursor: null, total: 0, error: limited.error };
  return limited.data;
}

function toPerson(
  r: PersonRow,
  now: Date,
  review?: { _avg: { rating: number | null }; _count: { _all: number } },
): PersonResult {
  const isTutor = r.role === Role.TUTOR;
  const availability = (r.tutorProfile?.availability ?? {}) as { isOnline?: unknown };
  const recentlyActive = !!r.lastActiveAt && now.getTime() - r.lastActiveAt.getTime() <= ONLINE_WINDOW_MS;
  const subjects = (isTutor ? r.tutorProfile?.subjects : r.studentProfile?.subjects) ?? [];
  return {
    id: r.id,
    name: r.name,
    username: r.username,
    avatar_url: avatarFor(r.id, r.avatar),
    role: isTutor ? "TUTOR" : "STUDENT",
    county: r.county || null,
    level: r.educationLevel ? LEVEL_LABEL[r.educationLevel] : null,
    form: r.studentProfile?.formLevel ?? (r.formYear ? `Form ${r.formYear}` : null),
    school: r.institutionStudent?.institution?.name ?? null,
    subjects,
    isOnline: isTutor ? availability.isOnline === true : recentlyActive,
    tutor: isTutor
      ? {
          rating: review?._avg.rating ?? null,
          reviewCount: review?._count._all ?? 0,
          hourlyRate: r.tutorProfile?.hourlyRate ?? null,
          verified: r.tutorProfile?.isVerified ?? false,
        }
      : null,
    matchedOn: null,
  };
}

/**
 * Back-compat wrapper (old callers): student-only search returning the legacy shape.
 */
export interface Student {
  id: string;
  name: string;
  school?: string;
  course?: string;
  username?: string;
  avatar_url?: string;
}

export async function searchStudents(query: string): Promise<Student[]> {
  const res = await searchPeople({ query, role: "STUDENT", limit: 20 });
  if (res.error) throw new Error(res.error);
  return res.items.map((p) => ({
    id: p.id,
    name: p.name,
    school: p.school ?? p.county ?? "Kenya",
    course: p.form ?? p.level ?? "",
    username: p.username ?? undefined,
    avatar_url: p.avatar_url,
  }));
}

// ─── Study buddies / students for tutors ─────────────────────────────────────

export interface SuggestedPerson extends PersonResult {
  sharedSubjects: string[];
  score: number;
}

/**
 * Students the viewer should meet: shared subjects, same level/form, same
 * county, recently active. For a tutor, "shared subjects" are the subjects
 * they teach, so this doubles as "students who need what I teach".
 */
export async function suggestStudyBuddies(
  input: { subject?: string; cursor?: string | null; limit?: number } = {},
): Promise<SearchPage<SuggestedPerson>> {
  const viewer = await getViewer();
  if (!viewer) return { items: [], nextCursor: null, total: 0, error: "Please sign in." };

  const isTutor = viewer.role === Role.TUTOR;
  const viewerSubjects = (isTutor ? viewer.tutorProfile?.subjects : viewer.studentProfile?.subjects) ?? [];
  const subject = cleanString(input.subject, 60);
  const needles = subject ? subjectNeedles(subject) : viewerSubjects.flatMap(subjectNeedles);

  const limited = await withRateLimit(
    "suggestStudyBuddies",
    viewer.id,
    async () => {
      const ids = needles.length ? await userIdsBySubject(needles) : [];
      const rows = await prisma.user.findMany({
        where: {
          id: needles.length ? { in: ids.filter((id) => id !== viewer.id) } : { not: viewer.id },
          role: Role.STUDENT,
          banned: false,
          suspended: false,
        },
        select: personSelect,
        take: CANDIDATE_CAP,
        orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { id: "asc" }],
      });

      const now = new Date();
      const tutorLevels = viewer.tutorProfile?.levelsTaught ?? [];
      const ranked = rankPeers(
        {
          id: viewer.id,
          subjects: viewerSubjects,
          educationLevel: isTutor ? (tutorLevels.length === 1 ? tutorLevels[0] : null) : viewer.educationLevel,
          form: isTutor ? null : (viewer.studentProfile?.formLevel ?? viewer.formYear),
          county: viewer.county,
          lastActiveAt: viewer.lastActiveAt,
        },
        rows.map((r) => ({
          id: r.id,
          subjects: r.studentProfile?.subjects ?? [],
          educationLevel: r.educationLevel,
          form: r.studentProfile?.formLevel ?? r.formYear,
          county: r.county,
          lastActiveAt: r.lastActiveAt,
        })),
        now,
        { requiredSubject: subject || null },
      );
      const byId = new Map(rows.map((r) => [r.id, r]));
      const fp = queryFingerprint({ buddies: viewer.id, subject: subjectKey(subject) });
      const page = paginate(ranked, input.cursor, input.limit ?? 12, fp);
      return {
        items: page.items.map((p) => ({
          ...toPerson(byId.get(p.id)!, now),
          sharedSubjects: p.sharedSubjects,
          score: Math.round(p.score * 100) / 100,
        })),
        nextCursor: page.nextCursor,
        total: ranked.length,
      };
    },
    { interval: 60_000, maxRequests: 30 },
  );
  if (!limited.success) return { items: [], nextCursor: null, total: 0, error: limited.error };
  return limited.data;
}

// ─── Tutor directory ─────────────────────────────────────────────────────────

export interface TutorDirectoryEntry {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  county: string | null;
  tutorProfile: {
    subjects: string[];
    levelsTaught: string[];
    bio: string;
    hourlyRate: number;
    rating: number | null;
    reviewCount: number;
    totalSessions: number;
    isVerified: boolean;
    availability: { isOnline: boolean };
  };
  tutorAvailabilities: { dayOfWeek: number; startTime: string; endTime: string; isBlocked: boolean }[];
  tutorAvailabilityBlocks: { startAt: string; endAt: string }[];
  match: { score: number; reasons: string[] };
}

export interface FindTutorsInput {
  query?: string;
  subject?: string;
  level?: EduLevel | "ALL";
  county?: string;
  onlineOnly?: boolean;
  maxHourlyRate?: number;
  cursor?: string | null;
  limit?: number;
}

/**
 * Ranked tutor directory. Order comes from rankTutors (subject, level,
 * curriculum, Bayesian rating, experience, acceptance rate, availability,
 * load, price, county tiebreak); a text query filters and re-tiers by
 * exact > prefix > contains first.
 */
export async function findTutors(input: FindTutorsInput = {}): Promise<SearchPage<TutorDirectoryEntry>> {
  const viewer = await getViewer();
  if (!viewer) return { items: [], nextCursor: null, total: 0, error: "Please sign in to browse tutors." };

  const query = cleanString(input.query, 80);
  const subject = cleanString(input.subject, 60);
  const level = input.level === "HIGH_SCHOOL" || input.level === "UNIVERSITY" ? input.level : null;
  const county = cleanString(input.county, 40);
  const onlineOnly = input.onlineOnly === true;
  const maxHourlyRate =
    typeof input.maxHourlyRate === "number" && input.maxHourlyRate > 0 ? Math.floor(input.maxHourlyRate) : null;

  const limited = await withRateLimit(
    "findTutors",
    viewer.id,
    async () => {
      const tutors = await loadTutorCandidates({
        onlineOnly,
        excludeIds: [viewer.id],
        subject: subject || null,
      });
      const countyFiltered = county ? tutors.filter((t) => countyKey(t.county).includes(countyKey(county))) : tutors;

      const ranked = rankTutors(countyFiltered, {
        subjects: subject ? [subject] : [],
        // Explicit filter wins; otherwise rank for the viewer's own level.
        level: level ?? (viewer.role === Role.STUDENT ? viewer.educationLevel : null),
        curriculum: viewer.curriculum,
        county: county || viewer.county,
        maxHourlyRate,
      });
      // An explicit level filter is a hard filter (rankTutors only excludes known mismatches).
      const byId = new Map(countyFiltered.map((t) => [t.id, t]));
      let ordered = ranked.filter((r) => !level || (byId.get(r.id)?.levelsTaught ?? []).some((l) => levelKey(l) === level));

      if (query.length >= 2) {
        const scored: { r: (typeof ordered)[number]; s: number }[] = [];
        for (const r of ordered) {
          const t = byId.get(r.id)!;
          const s = scoreSearchCandidate(
            {
              id: t.id,
              name: t.name,
              username: t.username,
              subjects: [...t.subjects],
              levels: t.levelsTaught.map((l) => LEVEL_LABEL[l] ?? l),
              county: t.county,
            },
            query,
            Math.min(1, r.score),
          );
          if (s) scored.push({ r, s: s.score });
        }
        scored.sort((a, b) => b.s - a.s || (a.r.id < b.r.id ? -1 : 1));
        ordered = scored.map((x) => x.r);
      }

      const fp = queryFingerprint({ t: 1, query: normalizeText(query), subject, level, county, onlineOnly, maxHourlyRate });
      const page = paginate(ordered, input.cursor, input.limit ?? 12, fp);
      const blocks = await loadBlocks(page.items.map((r) => r.id));

      const items: TutorDirectoryEntry[] = page.items.map((r) => {
        const t = byId.get(r.id)!;
        return {
          id: t.id,
          name: t.name,
          username: t.username,
          avatar: t.avatar,
          county: t.county ?? null,
          tutorProfile: {
            subjects: [...t.subjects],
            levelsTaught: [...t.levelsTaught],
            bio: t.bio,
            hourlyRate: t.hourlyRate ?? 0,
            rating: t.reviewCount ? (t.avgRating ?? null) : null,
            reviewCount: t.reviewCount ?? 0,
            totalSessions: t.completedSessions ?? 0,
            isVerified: t.isVerified,
            availability: { isOnline: !!t.isOnline },
          },
          tutorAvailabilities: t.slotsRaw
            .filter((s) => s.isRecurring)
            .map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isBlocked: !!s.isBlocked })),
          tutorAvailabilityBlocks: blocks.get(t.id) ?? [],
          match: { score: Math.round(r.score * 100) / 100, reasons: r.reasons },
        };
      });
      return { items, nextCursor: page.nextCursor, total: ordered.length };
    },
    { interval: 60_000, maxRequests: 60 },
  );
  if (!limited.success) return { items: [], nextCursor: null, total: 0, error: limited.error };
  return limited.data;
}

/** Future busy blocks (calendar imports / manual) so booking never offers a busy slot. */
async function loadBlocks(tutorIds: string[]): Promise<Map<string, { startAt: string; endAt: string }[]>> {
  const out = new Map<string, { startAt: string; endAt: string }[]>();
  if (tutorIds.length === 0) return out;
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("tutor_availability_blocks")
      .select("tutor_id, start_at, end_at")
      .in("tutor_id", tutorIds)
      .gte("end_at", new Date().toISOString())
      .limit(2000);
    if (error || !data) return out;
    for (const b of data as { tutor_id: string; start_at: string; end_at: string }[]) {
      const list = out.get(b.tutor_id) ?? [];
      list.push({ startAt: b.start_at, endAt: b.end_at });
      out.set(b.tutor_id, list);
    }
  } catch {
    /* blocks are an enhancement; slots still render without them */
  }
  return out;
}
