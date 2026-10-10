import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import { getResultsSummary } from "@/app/actions/institution-results";
import { getCurrentTerm } from "@/app/actions/institution-admin";
import {
  getAtRiskStudents,
  getClassRankings,
  getResultTerms,
  getValueAddedReport,
} from "@/app/actions/institution-analytics";
import { parseTermParam } from "@/lib/institution-analytics";
import { RankingsPanel } from "@/components/institution/rankings-panel";
import { AtRiskPanel, ValueAddedPanel } from "@/components/institution/analytics-panels";
import { TermPicker } from "@/components/institution/term-picker";
import { ResultsClient } from "./results-client";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const RISK_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const membership = await requireInstitutionAdmin();
  const institutionId = membership.institution.id;
  const sp = await searchParams;
  const term = parseTermParam(sp.term);
  const riskParam = one(sp.risk);
  const riskLevel = RISK_LEVELS.find((l) => l === riskParam) ?? "ALL";

  const [summary, currentTerm, terms, rankings, risk, valueAdded] = await Promise.all([
    getResultsSummary(institutionId),
    getCurrentTerm(institutionId),
    getResultTerms(institutionId),
    getClassRankings(institutionId, {
      term,
      className: one(sp.class) ?? null,
      stream: one(sp.stream) ?? null,
      search: one(sp.q) ?? null,
      page: Number(one(sp.page)) || 1,
    }),
    getAtRiskStudents(institutionId, { term, level: riskLevel, page: Number(one(sp.riskPage)) || 1 }),
    getValueAddedReport(institutionId, term),
  ]);

  const params: Record<string, string | undefined> = {
    term: one(sp.term),
    class: one(sp.class),
    stream: one(sp.stream),
    q: one(sp.q),
    page: one(sp.page),
    risk: riskParam,
    riskPage: one(sp.riskPage),
  };

  return (
    <div className="space-y-6">
      <ResultsClient
        initialSummary={summary}
        currentTerm={currentTerm ? { term: currentTerm.term, year: currentTerm.year } : null}
        termPicker={<TermPicker terms={terms} value={rankings.focus} />}
      />
      <RankingsPanel institutionId={institutionId} data={rankings} />
      <AtRiskPanel data={risk} basePath="/institution/dashboard/results" params={params} />
      <ValueAddedPanel data={valueAdded} />
    </div>
  );
}
