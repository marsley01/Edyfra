import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import { getResultsSummary } from "@/app/actions/institution-results";
import { getCurrentTerm } from "@/app/actions/institution-admin";
import { ResultsClient } from "./results-client";

export default async function ResultsPage() {
  const membership = await requireInstitutionAdmin();
  const [summary, currentTerm] = await Promise.all([
    getResultsSummary(membership.institution.id),
    getCurrentTerm(membership.institution.id),
  ]);
  return <ResultsClient initialSummary={summary} currentTerm={currentTerm ? { term: currentTerm.term, year: currentTerm.year } : null} />;
}
