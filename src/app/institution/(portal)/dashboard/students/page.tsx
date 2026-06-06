import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import { getInstitutionStudentsList } from "@/app/actions/institution-admin";
import { StudentsClient } from "./students-client";

export default async function StudentsPage() {
  const membership = await requireInstitutionAdmin();
  const rows = await getInstitutionStudentsList(membership.institution.id);
  return <StudentsClient initialRows={rows} />;
}
