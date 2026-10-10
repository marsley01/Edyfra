"use server";

import { revalidatePath } from "next/cache";
import { cache } from "react";
import { z } from "zod";
import { Prisma } from "@/generated/client";
import prisma from "@/lib/prisma";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireInstitutionAdmin } from "./institution-guard";
import { assertInstitutionAdminAccess, logInstitutionActivity } from "./_institution-access";
import { randomBytes } from "crypto";
import { getAppUrl } from "@/lib/app-url";

// ─── Overview ────────────────────────────────────────────────────────────

export interface OverviewStats {
  totalStudents: number;
  totalTeachers: number;
  activeCoachingSessions: number;
  averagePerformance: number;
  admins: { id: string; name: string; email: string; role: string; title: string | null }[];
}

export const getInstitutionOverview = cache(async (institutionId: string): Promise<OverviewStats> => {
  await assertInstitutionAdminAccess(institutionId);
  const [students, teachers, activeCoaching, recentResults] = await Promise.all([
    prisma.institutionMember.count({
      where: { institutionId, role: "INSTITUTION_STUDENT", status: "ACTIVE" },
    }),
    prisma.institutionMember.count({
      where: { institutionId, role: "INSTITUTION_TEACHER", status: "ACTIVE" },
    }),
    prisma.coachingAssignment.count({
      where: { institutionId, status: { in: ["ACTIVE", "SCHEDULED"] } },
    }),
    prisma.studentResult.findFirst({
      where: { institutionId },
      orderBy: [{ year: "desc" }, { term: "desc" }],
      select: { term: true, year: true },
    }),
  ]);

  // Mean of the latest term with results, aggregated in the database (was a
  // mean of the 500 most recently inserted rows, mixing terms).
  const latestAgg = recentResults
    ? await prisma.studentResult.aggregate({
        where: { institutionId, term: recentResults.term, year: recentResults.year },
        _avg: { marks: true },
      })
    : null;
  const avg = latestAgg?._avg.marks != null ? Math.round(latestAgg._avg.marks * 10) / 10 : 0;

  const adminRows = await prisma.institutionMember.findMany({
    where: { institutionId, role: { in: ["INSTITUTION_ADMIN", "INSTITUTION_DEPUTY"] }, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });
  const adminMeta = await prisma.institutionAdmin.findMany({
    where: { institutionId },
    select: { userId: true, title: true },
  });
  const titleByUser = new Map(adminMeta.map((a) => [a.userId, a.title]));

  return {
    totalStudents: students,
    totalTeachers: teachers,
    activeCoachingSessions: activeCoaching,
    averagePerformance: avg,
    admins: adminRows.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      title: titleByUser.get(m.user.id) ?? null,
    })),
  };
});

export interface SubjectTrendPoint {
  term: string; // "Term 1 2026"
  termNum: number;
  year: number;
  subject: string;
  average: number;
}

export const getInstitutionPerformanceTrend = cache(async (
  institutionId: string,
): Promise<SubjectTrendPoint[]> => {
  await assertInstitutionAdminAccess(institutionId);
  const rows = await prisma.studentResultsAnalysis.findMany({
    where: { institutionId },
    select: { subject: true, term: true, year: true, marks: true },
  });

  // Group by subject → term → avg
  const map = new Map<string, Map<string, { sum: number; count: number }>>();
  for (const r of rows) {
    const subj = r.subject;
    const termKey = `${r.year}-T${r.term}`;
    if (!map.has(subj)) map.set(subj, new Map());
    const sub = map.get(subj)!;
    if (!sub.has(termKey)) sub.set(termKey, { sum: 0, count: 0 });
    const bucket = sub.get(termKey)!;
    bucket.sum += r.marks;
    bucket.count += 1;
  }

  const out: SubjectTrendPoint[] = [];
  for (const [subject, terms] of map.entries()) {
    for (const [termKey, { sum, count }] of terms.entries()) {
      const [yearStr, tStr] = termKey.split("-T");
      out.push({
        term: `Term ${tStr} ${yearStr}`,
        termNum: Number(tStr),
        year: Number(yearStr),
        subject,
        average: Math.round((sum / count) * 10) / 10,
      });
    }
  }
  // Sort: year asc, term asc, subject asc
  out.sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.termNum !== b.termNum ? a.termNum - b.termNum : a.subject.localeCompare(b.subject),
  );
  return out;
});

export interface FlaggedStudent {
  studentUserId: string;
  studentName: string;
  form: string;
  subject: string;
  marks: number;
  flag: string;
  admissionNumber?: string | null;
}

export const getFlaggedStudents = cache(async (
  institutionId: string,
  currentTerm: number,
  currentYear: number,
): Promise<FlaggedStudent[]> => {
  await assertInstitutionAdminAccess(institutionId);
  const rows = await prisma.studentResultsAnalysis.findMany({
    where: {
      institutionId,
      term: currentTerm,
      year: currentYear,
      flag: { in: ["CRITICAL", "AT_RISK"] },
    },
    include: {
      result: { select: { form: true, admissionNumber: true, studentName: true } },
    },
    orderBy: { marks: "asc" },
    take: 50,
  });
  return rows.map((r) => ({
    studentUserId: r.studentUserId,
    studentName: r.result.studentName,
    form: r.result.form ?? '',
    subject: r.subject,
    marks: r.marks,
    flag: r.flag,
    admissionNumber: r.result.admissionNumber,
  }));
});

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: Date;
  actorName?: string | null;
}

export const getRecentActivity = cache(async (institutionId: string): Promise<ActivityItem[]> => {
  await assertInstitutionAdminAccess(institutionId);
  const rows = await prisma.institutionActivity.findMany({
    where: { institutionId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { actor: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt,
    actorName: r.actor?.name ?? null,
  }));
});

// ─── Students ────────────────────────────────────────────────────────────

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  admissionNumber: string | null;
  form: string;
  stream: string | null;
  subjects: string[];
  lastActive: Date | null;
  performance: "GREEN" | "YELLOW" | "RED" | null;
  averageMarks: number | null;
}

export const getInstitutionStudentsList = cache(async (
  institutionId: string,
  opts?: { search?: string; form?: string; performance?: "GREEN" | "YELLOW" | "RED" },
): Promise<StudentRow[]> => {
  await assertInstitutionAdminAccess(institutionId);
  const members = await prisma.institutionMember.findMany({
    where: {
      institutionId,
      role: "INSTITUTION_STUDENT",
      status: "ACTIVE",
      ...(opts?.search
        ? {
            user: {
              OR: [
                { name: { contains: opts.search, mode: "insensitive" } },
                { email: { contains: opts.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          lastActiveAt: true,
          formYear: true,
          educationLevel: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  if (members.length === 0) return [];

  // Aggregate in the database (no per-student queries). Previously every
  // result row was loaded and averaged with "(avg + marks) / 2", which is not
  // a mean (it weights the last row 50%).
  const userIds = members.map((m) => m.user.id);
  const [termAverages, statusGroups, subjectGroups, instStudents] = await Promise.all([
    prisma.studentResult.groupBy({
      by: ["studentUserId", "year", "term"],
      where: { institutionId, studentUserId: { in: userIds } },
      _avg: { marks: true },
    }),
    prisma.studentResultsAnalysis.groupBy({
      by: ["studentUserId", "year", "term", "overallStatus"],
      where: { institutionId, studentUserId: { in: userIds } },
    }),
    prisma.studentResult.groupBy({
      by: ["studentUserId", "subject"],
      where: { institutionId, studentUserId: { in: userIds } },
    }),
    prisma.institutionStudent.findMany({
      where: { institutionId, userId: { in: userIds } },
      select: { userId: true, studentIdStr: true, classYear: true },
    }),
  ]);

  // Latest term with results, per student.
  const latest = new Map<string, { idx: number; avg: number }>();
  for (const g of termAverages) {
    if (!g.studentUserId) continue;
    const idx = g.year * 3 + g.term;
    const cur = latest.get(g.studentUserId);
    if (!cur || idx > cur.idx) latest.set(g.studentUserId, { idx, avg: g._avg.marks ?? 0 });
  }
  const SEVERITY = { RED: 2, YELLOW: 1, GREEN: 0 } as const;
  const status = new Map<string, "GREEN" | "YELLOW" | "RED">();
  for (const g of statusGroups) {
    if (latest.get(g.studentUserId)?.idx !== g.year * 3 + g.term) continue;
    const cur = status.get(g.studentUserId);
    const next = g.overallStatus as "GREEN" | "YELLOW" | "RED";
    if (!cur || SEVERITY[next] > SEVERITY[cur]) status.set(g.studentUserId, next);
  }
  const subjects = new Map<string, Set<string>>();
  for (const g of subjectGroups) {
    if (!g.studentUserId) continue;
    const set = subjects.get(g.studentUserId) ?? new Set<string>();
    set.add(g.subject);
    subjects.set(g.studentUserId, set);
  }
  const instByUser = new Map(instStudents.map((s) => [s.userId, s]));

  const result = members
    .map<StudentRow>((m) => {
      const u = m.user;
      const inst = instByUser.get(u.id);
      const lt = latest.get(u.id);
      const classYear = inst?.classYear ? Number(inst.classYear) : null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        admissionNumber: inst?.studentIdStr ?? null,
        form: formatForm(u.educationLevel, Number.isFinite(classYear) && classYear ? classYear : u.formYear),
        stream: null,
        subjects: Array.from(subjects.get(u.id) ?? []).slice(0, 5),
        lastActive: u.lastActiveAt,
        performance: status.get(u.id) ?? null,
        averageMarks: lt ? Math.round(lt.avg * 10) / 10 : null,
      };
    })
    .filter((s) => (opts?.form ? s.form === opts.form : true))
    .filter((s) => (opts?.performance ? s.performance === opts.performance : true));

  return result;
});

function formatForm(level: string | null | undefined, year: number | null | undefined): string {
  if (level === "UNIVERSITY") return `Year ${year ?? 1}`;
  return `Form ${year ?? 1}`;
}

const AddStudentSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  formYear: z.coerce.number().int().min(1).max(8),
  admissionNumber: z.string().max(60).optional().nullable(),
  stream: z.string().max(40).optional().nullable(),
});

export type AddStudentInput = z.infer<typeof AddStudentSchema>;

export async function addStudent(input: AddStudentInput) {
  const membership = await requireInstitutionAdmin();
  const parsed = AddStudentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const admin = createAdminClient();

  // Create or fetch the user
  let userId: string;
  try {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
        user_metadata: { name: data.fullName, role: "STUDENT" },
      });
      if (error || !created.user) {
        return { ok: false as const, error: error?.message ?? "Could not create user" };
      }
      userId = created.user.id;
      // The auth trigger may already have inserted the mirror row — upsert so
      // that race doesn't surface as a unique-constraint crash.
      await prisma.user.upsert({
        where: { id: userId },
        update: { formYear: data.formYear },
        create: {
          id: userId,
          email: data.email.toLowerCase(),
          name: data.fullName,
          role: "STUDENT",
          county: "Unknown",
          formYear: data.formYear,
        },
      });
    }

    // Never silently demote an existing admin/deputy/teacher of this school
    // to a student by re-adding their email here.
    const current = await prisma.institutionMember.findUnique({
      where: { institutionId_userId: { institutionId: membership.institution.id, userId } },
      select: { role: true, status: true },
    });
    if (current && current.status === "ACTIVE" && current.role !== "INSTITUTION_STUDENT") {
      return {
        ok: false as const,
        error: "That email already belongs to a staff member of this institution.",
      };
    }

    // Link the student
    await prisma.institutionMember.upsert({
      where: { institutionId_userId: { institutionId: membership.institution.id, userId } },
      create: {
        institutionId: membership.institution.id,
        userId,
        role: "INSTITUTION_STUDENT",
        status: "ACTIVE",
      },
      update: { status: "ACTIVE", role: "INSTITUTION_STUDENT" },
    });

    // Persist the admission number: results import matches students by
    // InstitutionStudent.studentIdStr, which was never written, so admission
    // matching could never succeed.
    if (data.admissionNumber) {
      await prisma.institutionStudent.upsert({
        where: { userId },
        create: {
          institutionId: membership.institution.id,
          userId,
          studentIdStr: data.admissionNumber,
          classYear: String(data.formYear),
        },
        update: {
          institutionId: membership.institution.id,
          studentIdStr: data.admissionNumber,
          classYear: String(data.formYear),
        },
      });
    }
  } catch (err) {
    console.error("[addStudent] failed:", err);
    return { ok: false as const, error: "Could not add that student. Please try again." };
  }

  await logActivity(membership.institution.id, {
    type: "STUDENT_JOINED",
    actorUserId: membership.member.userId,
    targetUserId: userId,
    title: "Student added",
    body: `${data.fullName} was added to the institution.`,
  });

  revalidatePath("/institution/dashboard/students");
  return { ok: true as const, userId };
}

export async function removeStudent(studentUserId: string) {
  const membership = await requireInstitutionAdmin();
  // Scope by role so this can't be used to remove an admin/teacher.
  const res = await prisma.institutionMember.updateMany({
    where: { institutionId: membership.institution.id, userId: studentUserId, role: "INSTITUTION_STUDENT" },
    data: { status: "REMOVED" },
  });
  if (res.count === 0) return { ok: false as const, error: "Student not found in this institution" };
  await logActivity(membership.institution.id, {
    type: "STUDENT_REMOVED",
    actorUserId: membership.member.userId,
    targetUserId: studentUserId,
    title: "Student removed",
    body: `Student was removed from the institution (Edyfra account preserved).`,
  });
  revalidatePath("/institution/dashboard/students");
  return { ok: true as const };
}

// ─── Teachers ────────────────────────────────────────────────────────────

export interface TeacherRow {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  forms: string[];
  sessionsCompleted: number;
  studentsAssigned: number;
  status: "ACTIVE" | "INVITED" | "REMOVED";
}

export const getInstitutionTeachersList = cache(async (institutionId: string): Promise<TeacherRow[]> => {
  await assertInstitutionAdminAccess(institutionId);
  const [members, invitations] = await Promise.all([
    prisma.institutionMember.findMany({
      where: { institutionId, role: "INSTITUTION_TEACHER" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tutorProfile: { select: { totalSessions: true, subjects: true } },
          },
        },
      },
    }),
    prisma.institutionInvitation.findMany({
      where: { institutionId, role: "TEACHER", status: "PENDING" },
    }),
  ]);

  // Subjects + forms from TeacherSubjectAssignment
  const teacherIds = members.map((m) => m.userId);
  const assignments = teacherIds.length
    ? await prisma.teacherSubjectAssignment.findMany({
        where: { institutionId, teacherUserId: { in: teacherIds } },
      })
    : [];
  const byTeacher = new Map<string, { subjects: Set<string>; forms: Set<string> }>();
  for (const a of assignments) {
    if (!byTeacher.has(a.teacherUserId)) byTeacher.set(a.teacherUserId, { subjects: new Set(), forms: new Set() });
    const cur = byTeacher.get(a.teacherUserId)!;
    cur.subjects.add(a.subject);
    if (a.formYear) cur.forms.add(a.formYear);
  }

  // Coaching counts
  const coachingCounts = teacherIds.length
    ? await prisma.coachingAssignment.groupBy({
        by: ["teacherUserId"],
        where: { institutionId, teacherUserId: { in: teacherIds } },
        _count: { studentUserId: true },
      })
    : [];
  const coachingMap = new Map(coachingCounts.map((c) => [c.teacherUserId, c._count.studentUserId]));

  const rows: TeacherRow[] = members.map((m) => {
    const a = byTeacher.get(m.userId);
    return {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      subjects: a ? Array.from(a.subjects) : m.user.tutorProfile?.subjects ?? [],
      forms: a ? Array.from(a.forms) : [],
      sessionsCompleted: m.user.tutorProfile?.totalSessions ?? 0,
      studentsAssigned: coachingMap.get(m.userId) ?? 0,
      status: m.status === "ACTIVE" ? "ACTIVE" : "REMOVED",
    };
  });

  // Add invited (not yet accepted) teachers
  for (const inv of invitations) {
    rows.push({
      id: inv.id,
      name: inv.name,
      email: inv.email,
      subjects: inv.subjects,
      forms: inv.formYear ? [inv.formYear] : [],
      sessionsCompleted: 0,
      studentsAssigned: 0,
      status: "INVITED",
    });
  }

  return rows;
});

const InviteTeacherSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  subjects: z.array(z.string().min(1)).min(1).max(10),
  formYear: z.string().max(40).optional().nullable(),
});

export type InviteTeacherInput = z.infer<typeof InviteTeacherSchema>;

export async function inviteTeacher(input: InviteTeacherInput) {
  const membership = await requireInstitutionAdmin();
  const parsed = InviteTeacherSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

  const invite = await prisma.institutionInvitation.upsert({
    where: {
      institutionId_email_role: {
        institutionId: membership.institution.id,
        email: data.email.toLowerCase(),
        role: "TEACHER",
      },
    },
    create: {
      institutionId: membership.institution.id,
      email: data.email.toLowerCase(),
      name: data.name,
      role: "TEACHER",
      subjects: data.subjects,
      formYear: data.formYear ?? null,
      token,
      invitedById: membership.member.userId,
      expiresAt,
    },
    update: {
      status: "PENDING",
      token,
      expiresAt,
      subjects: data.subjects,
      formYear: data.formYear ?? null,
      name: data.name,
    },
  });

  await logActivity(membership.institution.id, {
    type: "TEACHER_INVITED",
    actorUserId: membership.member.userId,
    title: "Teacher invited",
    body: `Invitation sent to ${data.name} (${data.email}).`,
  });

  // Email the invitee
  try {
    const { getResend } = await import("@/lib/email");
    const resend = getResend();
    const acceptUrl = `${getAppUrl()}/institution/accept?token=${token}`;
    await resend.emails.send({
      from: "Edyfra Institutions <institutions@edyfra.online>",
      to: data.email,
      subject: `You're invited to join ${membership.institution.name} on Edyfra`,
      html: `
        <h2>Hi ${data.name},</h2>
        <p>The admin from <strong>${membership.institution.name}</strong> has invited you to teach on Edyfra under their institution.</p>
        <p>Subjects you'll teach: ${data.subjects.join(", ")}</p>
        <p>Accept the invitation by creating your teacher account:</p>
        <p><a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;background:#FF9500;color:white;border-radius:8px;text-decoration:none;">Accept invitation</a></p>
        <p>This link expires in 14 days.</p>
      `,
    });
  } catch (e) {
    console.warn("[inviteTeacher] email failed:", e);
  }

  revalidatePath("/institution/dashboard/teachers");
  return { ok: true as const, inviteId: invite.id };
}

export async function removeTeacher(teacherUserId: string) {
  const membership = await requireInstitutionAdmin();
  // Scope by role so this can't be used to remove an admin/student.
  const res = await prisma.institutionMember.updateMany({
    where: { institutionId: membership.institution.id, userId: teacherUserId, role: "INSTITUTION_TEACHER" },
    data: { status: "REMOVED" },
  });
  if (res.count === 0) return { ok: false as const, error: "Teacher not found in this institution" };
  await logActivity(membership.institution.id, {
    type: "TEACHER_REMOVED",
    actorUserId: membership.member.userId,
    targetUserId: teacherUserId,
    title: "Teacher removed",
    body: `Teacher was removed from the institution (Edyfra account preserved).`,
  });
  revalidatePath("/institution/dashboard/teachers");
  return { ok: true as const };
}

/** Revokes a pending teacher invitation (the invite link stops working). */
export async function revokeTeacherInvitation(invitationId: string) {
  const membership = await requireInstitutionAdmin();
  const res = await prisma.institutionInvitation.updateMany({
    where: { id: String(invitationId), institutionId: membership.institution.id, status: "PENDING" },
    data: { status: "REVOKED" },
  });
  if (res.count === 0) return { ok: false as const, error: "Invitation not found or already used" };
  revalidatePath("/institution/dashboard/teachers");
  return { ok: true as const };
}

// ─── Settings ────────────────────────────────────────────────────────────

const SettingsSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().max(160).optional().nullable(),
  website: z.string().url().max(160).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  motto: z.string().max(160).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  schoolType: z.enum(["PRIMARY", "SECONDARY", "COLLEGE", "UNIVERSITY"]).optional().nullable(),
  curriculum: z.enum(["CBC", "EIGHT_FOUR_FOUR", "IGCSE", "MIXED", "UNIVERSITY"]).optional().nullable(),
  county: z.string().max(60).optional().nullable(),
  subCounty: z.string().max(60).optional().nullable(),
  studentCount: z.coerce.number().int().min(0).max(200000).optional().nullable(),
});

export async function updateInstitutionSettings(input: z.infer<typeof SettingsSchema>) {
  const membership = await requireInstitutionAdmin();
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await prisma.institution.update({
    where: { id: membership.institution.id },
    data: parsed.data,
  });
  await logActivity(membership.institution.id, {
    type: "SETTINGS_UPDATED",
    actorUserId: membership.member.userId,
    title: "School details updated",
  });
  // The school name is rendered by the portal layout on every page.
  revalidatePath("/institution/dashboard", "layout");
  return { ok: true as const };
}

const DeputySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  title: z.enum(["PRINCIPAL", "DEPUTY", "HOD", "REGISTRAR", "OTHER"]),
});

export async function addDeputyAdmin(input: z.infer<typeof DeputySchema>) {
  const membership = await requireInstitutionAdmin();
  const parsed = DeputySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const admin = createAdminClient();

  // Ensure user exists
  let userId: string;
  try {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
        user_metadata: { name: data.name, role: "INSTITUTION_DEPUTY" },
      });
      if (error || !created.user) {
        return { ok: false as const, error: error?.message ?? "Could not create deputy" };
      }
      userId = created.user.id;
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: data.email.toLowerCase(),
          name: data.name,
          role: "STUDENT", // base role; InstitutionMember is the institution-specific role
          county: "Unknown",
        },
      });
    }

    const current = await prisma.institutionMember.findUnique({
      where: { institutionId_userId: { institutionId: membership.institution.id, userId } },
      select: { role: true, status: true },
    });
    if (current?.status === "ACTIVE" && current.role === "INSTITUTION_ADMIN") {
      return { ok: false as const, error: "That person is already the primary admin." };
    }

    // upsert: re-adding a previously added deputy must not crash on the
    // (institutionId, userId) unique constraint.
    await prisma.institutionAdmin.upsert({
      where: { institutionId_userId: { institutionId: membership.institution.id, userId } },
      create: {
        institutionId: membership.institution.id,
        userId,
        title: data.title,
        isPrimary: false,
      },
      update: { title: data.title },
    });
    await prisma.institutionMember.upsert({
      where: { institutionId_userId: { institutionId: membership.institution.id, userId } },
      create: {
        institutionId: membership.institution.id,
        userId,
        role: "INSTITUTION_DEPUTY",
        status: "ACTIVE",
      },
      update: { status: "ACTIVE", role: "INSTITUTION_DEPUTY" },
    });
  } catch (err) {
    console.error("[addDeputyAdmin] failed:", err);
    return { ok: false as const, error: "Could not add that deputy. Please try again." };
  }

  await logActivity(membership.institution.id, {
    type: "ADMIN_ADDED",
    actorUserId: membership.member.userId,
    targetUserId: userId,
    title: "Deputy admin added",
    body: `${data.name} was added as a ${data.title.toLowerCase()}.`,
  });
  revalidatePath("/institution/dashboard/settings");
  return { ok: true as const };
}

const TermSchema = z.object({
  term: z.coerce.number().int().min(1).max(3),
  year: z.coerce.number().int().min(2020).max(2099),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  holidayStart: z.coerce.date().optional().nullable(),
  holidayEnd: z.coerce.date().optional().nullable(),
  makeCurrent: z.boolean().optional(),
});

export async function upsertAcademicTerm(input: z.infer<typeof TermSchema>) {
  const membership = await requireInstitutionAdmin();
  const parsed = TermSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  if (data.endDate < data.startDate) {
    return { ok: false as const, error: "Term end must be after the start" };
  }
  if (data.holidayStart && data.holidayEnd && data.holidayEnd < data.holidayStart) {
    return { ok: false as const, error: "Holiday end must be after holiday start" };
  }

  if (data.makeCurrent) {
    await prisma.academicTerm.updateMany({
      where: { institutionId: membership.institution.id, isCurrent: true },
      data: { isCurrent: false },
    });
  }

  const saved = await prisma.academicTerm.upsert({
    where: {
      institutionId_term_year: {
        institutionId: membership.institution.id,
        term: data.term,
        year: data.year,
      },
    },
    create: {
      institutionId: membership.institution.id,
      term: data.term,
      year: data.year,
      startDate: data.startDate,
      endDate: data.endDate,
      holidayStart: data.holidayStart ?? null,
      holidayEnd: data.holidayEnd ?? null,
      isCurrent: data.makeCurrent ?? false,
    },
    update: {
      startDate: data.startDate,
      endDate: data.endDate,
      holidayStart: data.holidayStart ?? null,
      holidayEnd: data.holidayEnd ?? null,
      // Saving an existing term without "make current" must not demote it.
      ...(data.makeCurrent ? { isCurrent: true } : {}),
    },
  });
  if (data.makeCurrent) {
    await prisma.institution.update({ where: { id: membership.institution.id }, data: { currentTermId: saved.id } });
  }
  await logActivity(membership.institution.id, {
    type: "SETTINGS_UPDATED",
    actorUserId: membership.member.userId,
    title: "Academic term saved",
    body: `Term ${data.term} ${data.year}${data.makeCurrent ? " (current)" : ""}.`,
  });
  // The current term drives the overview, results, reports and coaching pages.
  revalidatePath("/institution/dashboard", "layout");
  return { ok: true as const };
}

export const getCurrentTerm = cache(async (institutionId: string) => {
  await assertInstitutionAdminAccess(institutionId);
  return prisma.academicTerm.findFirst({
    where: { institutionId, isCurrent: true },
  });
});

// ─── Activity helper (internal) ──────────────────────────────────────────

// Not exported: an exported function in a "use server" file is a publicly
// callable server action, which would let anyone write activity rows into any
// institution. Other modules import logInstitutionActivity directly.
const logActivity = logInstitutionActivity;
