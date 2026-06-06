import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import { getResultsSummary } from "@/app/actions/institution-results";
import { getInstitutionStudentsList } from "@/app/actions/institution-admin";
import { getCurrentTerm } from "@/app/actions/institution-admin";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const membership = await requireInstitutionAdmin();
  const [summary, students, currentTerm] = await Promise.all([
    getResultsSummary(membership.institution.id),
    getInstitutionStudentsList(membership.institution.id),
    getCurrentTerm(membership.institution.id),
  ]);
  return (
    <ReportsClient
      schoolName={membership.institution.name}
      summary={summary}
      students={students.map((s) => ({
        id: s.id,
        name: s.name,
        average: s.averageMarks ?? 0,
        flag: (s.performance ?? "GREEN") as "RED" | "YELLOW" | "GREEN",
      }))}
      termName={currentTerm ? `Term ${currentTerm.term} · ${currentTerm.year}` : "Current term"}
    />
  );
}
