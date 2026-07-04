import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import { getInstitutionOverview, getCurrentTerm } from "@/app/actions/institution-admin";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const membership = await requireInstitutionAdmin();
  const [overview, term] = await Promise.all([
    getInstitutionOverview(membership.institution.id),
    getCurrentTerm(membership.institution.id),
  ]);
  return (
    <SettingsClient
      institution={{
        id: membership.institution.id,
        name: membership.institution.name,
        motto: null,
        schoolType: membership.institution.type ?? null,
        curriculum: null,
        county: null,
        subCounty: null,
        address: null,
        contactEmail: membership.institution.email,
        contactPhone: membership.institution.phone,
        plan: membership.institution.plan,
        planLegacy: membership.institution.plan,
        status: membership.institution.isActive ? "ACTIVE" : "PENDING",
        admins: overview.admins as any[],
      }}
      term={
        term
          ? {
              term: term.term,
              year: term.year,
              startDate: term.startDate,
              endDate: term.endDate,
              holidayStart: term.holidayStart,
              holidayEnd: term.holidayEnd,
            }
          : null
      }
    />
  );
}
