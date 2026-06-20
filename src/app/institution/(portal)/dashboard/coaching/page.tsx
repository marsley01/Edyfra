import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import { getCoachingAssignments, isHolidayCoachingActive } from "@/app/actions/institution-coaching";
import { getInstitutionStudentsList, getInstitutionTeachersList } from "@/app/actions/institution-admin";
import { CoachingClient } from "./coaching-client";

export default async function CoachingPage() {
  const membership = await requireInstitutionAdmin();
  const [assignments, holidayActive, students, teachers] = await Promise.all([
    getCoachingAssignments(membership.institution.id),
    isHolidayCoachingActive(membership.institution.id),
    getInstitutionStudentsList(membership.institution.id),
    getInstitutionTeachersList(membership.institution.id),
  ]);
  return (
    <CoachingClient
      initialAssignments={assignments}
      holidayActive={holidayActive}
      students={students.map((s) => ({ id: s.id, name: s.name }))}
      teachers={teachers
        .filter((t) => t.status === "ACTIVE")
        .map((t) => ({ id: t.id, name: t.name, subjects: t.subjects }))}
    />
  );
}
