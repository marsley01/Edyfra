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
        motto: membership.institution.motto,
        schoolType: membership.institution.schoolType,
        curriculum: membership.institution.curriculum,
        county: membership.institution.county,
        subCounty: membership.institution.subCounty,
        address: membership.institution.address,
        contactEmail: membership.institution.email,
        contactPhone: membership.institution.phone,
        plan: membership.institution.planTier,
        planLegacy: membership.institution.plan,
        status: membership.institution.status,
        admins: overview.admins,
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
