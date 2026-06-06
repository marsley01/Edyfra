"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/client";
import prisma from "@/lib/prisma";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireInstitutionAdmin } from "./institution-guard";
import { randomBytes } from "crypto";

// ─── Overview ────────────────────────────────────────────────────────────

export interface OverviewStats {
  totalStudents: number;
  totalTeachers: number;
  activeCoachingSessions: number;
  averagePerformance: number;
  admins: { id: string; name: string; email: string; role: string; title: string | null }[];
}

export async function getInstitutionOverview(institutionId: string): Promise<OverviewStats> {
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
    prisma.studentResultsAnalysis.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const avg =
    recentResults.length > 0
      ? Math.round(
          (recentResults.reduce((s, r) => s + r.marks, 0) / recentResults.length) * 10,
        ) / 10
      : 0;

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
}

export interface SubjectTrendPoint {
  term: string; // "Term 1 2026"
  termNum: number;
  year: number;
  subject: string;
  average: number;
}

export async function getInstitutionPerformanceTrend(
  institutionId: string,
): Promise<SubjectTrendPoint[]> {
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
}

export interface FlaggedStudent {
  studentUserId: string;
  studentName: string;
  form: string;
  subject: string;
  marks: number;
  flag: string;
  admissionNumber?: string | null;
}

export async function getFlaggedStudents(
  institutionId: string,
  currentTerm: number,
  currentYear: number,
): Promise<FlaggedStudent[]> {
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
    form: r.result.form,
    subject: r.subject,
    marks: r.marks,
    flag: r.flag,
    admissionNumber: r.result.admissionNumber,
  }));
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: Date;
  actorName?: string | null;
}

export async function getRecentActivity(institutionId: string): Promise<ActivityItem[]> {
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
}

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

export async function getInstitutionStudentsList(
  institutionId: string,
  opts?: { search?: string; form?: string; performance?: "GREEN" | "YELLOW" | "RED" },
): Promise<StudentRow[]> {
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

  // Pull recent results per student
  const userIds = members.map((m) => m.user.id);
  const [latestResults, recentAnalyses] = await Promise.all([
    prisma.studentResult.findMany({
      where: { studentUserId: { in: userIds } },
      orderBy: [{ year: "desc" }, { term: "desc" }, { createdAt: "desc" }],
    }),
    prisma.studentResultsAnalysis.findMany({
      where: { studentUserId: { in: userIds } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Build a per-student performance summary
  const byStudent = new Map<string, { avg: number; status: "GREEN" | "YELLOW" | "RED" | null; subjects: Set<string> }>();
  for (const a of recentAnalyses) {
    const cur = byStudent.get(a.studentUserId) ?? { avg: 0, status: null, subjects: new Set() };
    cur.avg = (cur.avg + a.marks) / 2; // simple moving avg
    cur.subjects.add(a.subject);
    if (a.overallStatus === "RED") cur.status = "RED";
    else if (a.overallStatus === "YELLOW" && cur.status !== "RED") cur.status = "YELLOW";
    else if (a.overallStatus === "GREEN" && !cur.status) cur.status = "GREEN";
    byStudent.set(a.studentUserId, cur);
  }

  const result = members
    .map<StudentRow>((m) => {
      const u = m.user;
      const sum = byStudent.get(u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        admissionNumber: null,
        form: formatForm(u.educationLevel, u.formYear),
        stream: null,
        subjects: Array.from(sum?.subjects ?? []).slice(0, 5),
        lastActive: u.lastActiveAt,
        performance: sum?.status ?? null,
        averageMarks: sum ? Math.round(sum.avg * 10) / 10 : null,
      };
    })
    .filter((s) => (opts?.form ? s.form === opts.form : true))
    .filter((s) => (opts?.performance ? s.performance === opts.performance : true));

  return result;
}

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
  const existing = await prisma.user.findFirst({
    where: { email: data.email.toLowerCase() },
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
    await prisma.user.create({
      data: {
        id: userId,
        email: data.email.toLowerCase(),
        name: data.fullName,
        role: "STUDENT",
        county: membership.institution.county ?? "Unknown",
        formYear: data.formYear,
      },
    });
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
  await prisma.institutionMember.updateMany({
    where: { institutionId: membership.institution.id, userId: studentUserId },
    data: { status: "REMOVED" },
  });
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

export async function getInstitutionTeachersList(institutionId: string): Promise<TeacherRow[]> {
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
        where: { teacherUserId: { in: teacherIds } },
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
        where: { teacherUserId: { in: teacherIds } },
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
}

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
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/institution/accept?token=${token}`;
    await resend.emails.send({
      from: "Edyfra Institutions <institutions@edyfra.com>",
      to: data.email,
      subject: `You're invited to join ${membership.institution.name} on Edyfra`,
      html: `
        <h2>Hi ${data.name},</h2>
        <p>${membership.institution.adminName ?? "The admin"} from <strong>${membership.institution.name}</strong> has invited you to teach on Edyfra under their institution.</p>
        <p>Subjects you'll teach: ${data.subjects.join(", ")}</p>
        <p>Accept the invitation by creating your teacher account:</p>
        <p><a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;background:#3730A3;color:white;border-radius:8px;text-decoration:none;">Accept invitation</a></p>
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
  await prisma.institutionMember.updateMany({
    where: { institutionId: membership.institution.id, userId: teacherUserId },
    data: { status: "REMOVED" },
  });
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
  revalidatePath("/institution/dashboard/settings");
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
  const existing = await prisma.user.findFirst({ where: { email: data.email.toLowerCase() }, select: { id: true } });
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
    await prisma.user.create({
      data: {
        id: userId,
        email: data.email.toLowerCase(),
        name: data.name,
        role: "STUDENT", // base role; InstitutionMember is the institution-specific role
        county: membership.institution.county ?? "Unknown",
      },
    });
  }

  await prisma.institutionAdmin.create({
    data: {
      institutionId: membership.institution.id,
      userId,
      title: data.title,
      isPrimary: false,
    },
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

  await prisma.academicTerm.upsert({
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
      isCurrent: data.makeCurrent ?? false,
    },
  });
  revalidatePath("/institution/dashboard/settings");
  return { ok: true as const };
}

export async function getCurrentTerm(institutionId: string) {
  return prisma.academicTerm.findFirst({
    where: { institutionId, isCurrent: true },
  });
}

// ─── Activity helper (internal) ──────────────────────────────────────────

export async function logActivity(
  institutionId: string,
  data: {
    type: Parameters<typeof prisma.institutionActivity.create>[0]["data"]["type"];
    actorUserId?: string | null;
    targetUserId?: string | null;
    title: string;
    body?: string | null;
  },
) {
  try {
    await prisma.institutionActivity.create({
      data: {
        institutionId,
        type: data.type,
        actorUserId: data.actorUserId ?? null,
        targetUserId: data.targetUserId ?? null,
        title: data.title,
        body: data.body ?? null,
      },
    });
  } catch (e) {
    console.warn("[logActivity] failed:", e);
  }
}
