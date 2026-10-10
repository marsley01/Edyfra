import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import { getCoachingAssignments, isHolidayCoachingActive } from "@/app/actions/institution-coaching";
import { getInstitutionStudentsList, getInstitutionTeachersList } from "@/app/actions/institution-admin";
import { getCoachingRecommendations } from "@/app/actions/institution-analytics";
import { CoachingRecommendations } from "@/components/institution/coaching-recommendations";
import { CoachingClient } from "./coaching-client";

export default async function CoachingPage() {
  const membership = await requireInstitutionAdmin();
  const [assignments, holidayActive, students, teachers, recommendations] = await Promise.all([
    getCoachingAssignments(membership.institution.id),
    isHolidayCoachingActive(membership.institution.id),
    getInstitutionStudentsList(membership.institution.id),
    getInstitutionTeachersList(membership.institution.id),
    getCoachingRecommendations(membership.institution.id),
  ]);
  return (
    <div className="space-y-6">
      <CoachingClient
        initialAssignments={assignments}
        holidayActive={holidayActive}
        students={students.map((s) => ({ id: s.id, name: s.name }))}
        teachers={teachers
          .filter((t) => t.status === "ACTIVE")
          .map((t) => ({ id: t.id, name: t.name, subjects: t.subjects }))}
      />
      <CoachingRecommendations report={recommendations} />
    </div>
  );
}
