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
        // Pass the saved values through; these were hard-coded to null, so
        // the form always showed defaults and saving overwrote real data.
        motto: membership.institution.motto,
        schoolType: membership.institution.schoolType ?? null,
        curriculum: membership.institution.curriculum ?? null,
        county: membership.institution.county,
        subCounty: membership.institution.subCounty,
        address: membership.institution.address,
        contactEmail: membership.institution.email,
        contactPhone: membership.institution.phone,
        plan: membership.institution.planTier ?? null,
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
