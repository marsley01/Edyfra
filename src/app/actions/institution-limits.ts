import prisma from "@/lib/prisma";

export type LimitAction = "student" | "assignment" | "term";

const PLAN_LIMITS: Record<string, { maxStudents: number; maxAssignments: number; maxTermsStored: number }> = {
  FREE: { maxStudents: 200, maxAssignments: 5, maxTermsStored: 3 },
  STARTER: { maxStudents: 500, maxAssignments: 20, maxTermsStored: 6 },
  GROWTH: { maxStudents: 2000, maxAssignments: 100, maxTermsStored: 12 },
  ENTERPRISE: { maxStudents: 10000, maxAssignments: 500, maxTermsStored: 36 },
};

export async function checkInstitutionLimit(institutionId: string, action: LimitAction) {
  const inst = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { plan: true },
  });

  const limits = PLAN_LIMITS[inst?.plan ?? "FREE"] ?? PLAN_LIMITS.FREE;

  if (action === "student") {
    const studentCount = await prisma.institutionStudent.count({
      where: { institutionId },
    });
    if (studentCount >= limits.maxStudents) {
      throw new Error(`Plan limited to ${limits.maxStudents} students. Upgrade to add more.`);
    }
  }

  if (action === "assignment") {
    const assignmentCount = await prisma.coachingAssignment.count({
      where: { institutionId, status: "ACTIVE" },
    });
    if (assignmentCount >= limits.maxAssignments) {
      throw new Error(`Plan limited to ${limits.maxAssignments} active assignments. Upgrade to add more.`);
    }
  }

  if (action === "term") {
    const terms = await prisma.studentResult.findMany({
      where: { institutionId },
      distinct: ["term", "year"],
      orderBy: [{ year: "asc" }, { term: "asc" }],
    });

    if (terms.length >= limits.maxTermsStored) {
      const oldestTerm = terms[0];
      const oldestResults = await prisma.studentResult.findMany({
        where: { institutionId, term: oldestTerm.term, year: oldestTerm.year },
      });
      return { action: "archive", oldestTerm, data: oldestResults };
    }
  }

  return { action: "proceed" };
}
