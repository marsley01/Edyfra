"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const DEV_INSTITUTION_ID = "mock-1";

const mockInstitution = {
  id: "mock-1",
  name: "Kenyatta University",
  code: "KU-2026",
  description: "A leading institution of higher learning in Kenya, committed to academic excellence and innovation in education.",
  logo: null,
  banner: null,
  location: "Nairobi, Kenya",
  email: "admin@ku.ac.ke",
  phone: "+254 700 123 456",
  website: "https://ku.ac.ke",
  verified: true,
  plan: "premium",
  allowedDomains: ["ku.ac.ke", "student.ku.ac.ke"],
  createdAt: new Date(),
  updatedAt: new Date(),
  members: [],
  documents: [],
};

const mockStats = {
  totalStudents: 1284,
  totalInstructors: 48,
  totalAdmins: 3,
  recentSessions: 347,
  aiConversations: 892,
  aiTokensUsed: 245000,
  completionRate: 78,
};

function isDbOffline(err: unknown) {
  if (err instanceof Error) {
    const msg = err.message ?? "";
    return msg.includes("DATABASE_URL") || msg.includes("Can't reach database server") || msg.includes("Connection refused");
  }
  return false;
}

export async function getInstitutionDashboard(institutionId: string = DEV_INSTITUTION_ID) {
  try {
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        documents: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!institution) return null;

    const totalStudents = institution.members.filter((m) => m.role === "STUDENT" && m.status === "ACTIVE").length;
    const totalInstructors = institution.members.filter(
      (m) => m.role === "INSTRUCTOR" && m.status === "ACTIVE",
    ).length;
    const totalAdmins = institution.members.filter(
      (m) => m.role === "INSTITUTION_ADMIN" && m.status === "ACTIVE",
    ).length;

    const [recentSessions, aiConversations, completedSessions, totalSessions] = await Promise.all([
      prisma.session.count({
        where: {
          OR: [
            { student: { email: { in: institution.members.map((m) => m.user.email) } } },
            { partner: { email: { in: institution.members.map((m) => m.user.email) } } },
          ],
          startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.aiConversation.count({
        where: {
          userId: { in: institution.members.map((m) => m.user.id) },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.session.count({
        where: {
          OR: [
            { student: { email: { in: institution.members.map((m) => m.user.email) } } },
            { partner: { email: { in: institution.members.map((m) => m.user.email) } } },
          ],
          status: "COMPLETED",
        },
      }),
      prisma.session.count({
        where: {
          OR: [
            { student: { email: { in: institution.members.map((m) => m.user.email) } } },
            { partner: { email: { in: institution.members.map((m) => m.user.email) } } },
          ],
        },
      }),
    ]);

    return {
      institution,
      stats: {
        totalStudents,
        totalInstructors,
        totalAdmins,
        recentSessions,
        aiConversations,
        aiTokensUsed: 0,
        completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
      },
    };
  } catch (err) {
    if (isDbOffline(err)) {
      return { institution: mockInstitution, stats: mockStats };
    }
    throw err;
  }
}

export async function updateInstitutionProfile(
  institutionId: string,
  data: {
    name?: string;
    description?: string;
    location?: string;
    email?: string;
    phone?: string;
    website?: string;
    logo?: string;
    banner?: string;
    allowedDomains?: string[];
  },
) {
  try {
    const institution = await prisma.institution.update({
      where: { id: institutionId },
      data,
    });
    revalidatePath("/institution");
    return institution;
  } catch (err) {
    if (isDbOffline(err)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { id: institutionId, ...data } as any;
    }
    throw err;
  }
}

export async function getInstitutionMembers(
  institutionId: string,
  params?: { role?: string; status?: string; search?: string },
) {
  try {
    const where: Record<string, unknown> = { institutionId };

    if (params?.role) where.role = params.role;
    if (params?.status) where.status = params.status;
    if (params?.search) {
      where.user = {
        OR: [
          { name: { contains: params.search, mode: "insensitive" } },
          { email: { contains: params.search, mode: "insensitive" } },
        ],
      };
    }

    const members = await prisma.institutionMember.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: where as any,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            createdAt: true,
            tier: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return members;
  } catch (err) {
    if (isDbOffline(err)) return [];
    throw err;
  }
}

export async function updateMemberRole(
  memberId: string,
  role: "INSTITUTION_ADMIN" | "DEPARTMENT_HEAD" | "INSTRUCTOR" | "STUDENT",
) {
  try {
    const member = await prisma.institutionMember.update({
      where: { id: memberId },
      data: { role },
    });
    revalidatePath("/institution");
    return member;
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (isDbOffline(err)) return { id: memberId, role } as any;
    throw err;
  }
}

export async function removeMember(memberId: string) {
  try {
    await prisma.institutionMember.delete({
      where: { id: memberId },
    });
    revalidatePath("/institution");
  } catch (err) {
    if (isDbOffline(err)) return;
    throw err;
  }
}

export async function uploadInstitutionDocument(
  institutionId: string,
  data: {
    title: string;
    description?: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
  },
) {
  try {
    const document = await prisma.institutionDocument.create({
      data: { ...data, institutionId },
    });
    revalidatePath("/institution");
    return document;
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (isDbOffline(err)) return { id: "mock-doc", ...data, institutionId, createdAt: new Date() } as any;
    throw err;
  }
}

export async function deleteInstitutionDocument(documentId: string) {
  try {
    await prisma.institutionDocument.delete({
      where: { id: documentId },
    });
    revalidatePath("/institution");
  } catch (err) {
    if (isDbOffline(err)) return;
    throw err;
  }
}

export async function getInstitutionDocuments(institutionId: string) {
  try {
    return await prisma.institutionDocument.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      include: {
        uploader: { select: { id: true, name: true, avatar: true } },
      },
    });
  } catch (err) {
    if (isDbOffline(err)) return [];
    throw err;
  }
}
