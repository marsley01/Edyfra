import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import { getInstitutionTeachersList } from "@/app/actions/institution-admin";
import { TeachersClient } from "./teachers-client";

export default async function TeachersPage() {
  const membership = await requireInstitutionAdmin();
  const rows = await getInstitutionTeachersList(membership.institution.id);
  return <TeachersClient initialRows={rows} />;
}
