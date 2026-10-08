import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getAdminCaller } from "@/app/actions/_admin-guard";
import { listInstitutionApplications } from "@/app/actions/institution-founder";
import { InstitutionsReviewClient } from "./institutions-client";

export const revalidate = 0;

export default async function AdminInstitutionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Prisma role is the source of truth. The previous check queried a
  // non-existent "users" table, so every admin was redirected away.
  const dbUser = await getAdminCaller();
  if (!dbUser) {
    redirect("/dashboard");
  }

  const applications = await listInstitutionApplications("ALL");
  // Use the real lifecycle `status`, not `isActive` (which defaults to true, so
  // pending signups looked ACTIVE and rejected ones looked PENDING).
  const statusOf = (a: (typeof applications)[number]) =>
    a.status ?? (a.isActive ? "ACTIVE" : "PENDING");
  const pendingCount = applications.filter((a) => statusOf(a) === "PENDING").length;

  return (
    <InstitutionsReviewClient
      initialApplications={applications.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        schoolType: (a.schoolType ?? a.type ?? "SECONDARY") as any,
        curriculum: (a.curriculum ?? null) as any,
        county: a.county ?? null,
        subCounty: a.subCounty ?? null,
        studentCount: a.studentCount ?? null,
        planTier: (a.planTier ?? a.plan ?? "STARTER") as any,
        status: statusOf(a),
        email: a.email,
        adminName: a.adminName ?? null,
        adminTitle: a.adminTitle ?? null,
        adminPhone: a.adminPhone ?? null,
        adminEmail: a.adminEmail ?? a.email,
        createdAt: a.createdAt,
        approvedAt: a.approvedAt ?? null,
        membersCount: a._count.members,
        studentsCount: a._count.students,
        tutorsCount: a._count.tutors,
      }))}
      currentUserId={dbUser.id}
      pendingCount={pendingCount}
    />
  );
}
