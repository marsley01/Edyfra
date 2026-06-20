import prisma from "@/lib/prisma";

export type LimitAction = "student" | "assignment" | "term";

export async function checkInstitutionLimit(institutionId: string, action: LimitAction) {
  const limit = await prisma.institutionLimit.findUnique({
    where: { institutionId },
  });

  const maxStudents = limit?.maxStudents ?? 200;
  const maxAssignments = limit?.maxAssignments ?? 5;
  const maxTermsStored = limit?.maxTermsStored ?? 3;

  if (action === "student") {
    const studentCount = await prisma.institutionStudent.count({
      where: { institutionId },
    });
    if (studentCount >= maxStudents) {
      throw new Error(`Free plan limited to ${maxStudents} students. Upgrade to add more.`);
    }
  }

  if (action === "assignment") {
    const assignmentCount = await prisma.coachingAssignment.count({
      where: { institutionId, status: "active" },
    });
    if (assignmentCount >= maxAssignments) {
      throw new Error(`Free plan limited to ${maxAssignments} active assignments. Upgrade to add more.`);
    }
  }

  if (action === "term") {
    // When a new term is uploaded, automatically archive the oldest term
    const terms = await prisma.studentResult.findMany({
      where: { institutionId },
      distinct: ["term", "year"],
      orderBy: [{ year: "asc" }, { term: "asc" }],
    });

    if (terms.length >= maxTermsStored) {
      // Find the oldest term to archive
      const oldestTerm = terms[0];
      
      // Get all results for that term
      const oldestResults = await prisma.studentResult.findMany({
        where: {
          institutionId,
          term: oldestTerm.term,
          year: oldestTerm.year,
        },
      });

      // Save to storage (we will just return it here so caller can handle storage)
      return {
        action: "archive",
        oldestTerm,
        data: oldestResults,
      };
    }
  }

  return { action: "proceed" };
}
