import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { listInstitutionApplications } from "@/app/actions/institution-founder";
import { InstitutionsReviewClient } from "./institutions-client";

export const revalidate = 0;

export default async function AdminInstitutionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminSupabase = createAdminClient();
  const { data: dbUser } = await adminSupabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!dbUser || (dbUser.role !== "FOUNDER" && dbUser.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const applications = await listInstitutionApplications("ALL");
  const pendingCount = applications.filter((a) => !a.isActive).length;

  return (
    <InstitutionsReviewClient
      initialApplications={applications.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        schoolType: (a.type ?? "SECONDARY") as any,
        curriculum: null as any,
        county: null,
        subCounty: null,
        studentCount: null,
        planTier: (a.plan ?? "STARTER") as any,
        status: a.isActive ? "ACTIVE" : "PENDING",
        email: a.email,
        adminName: null,
        adminTitle: null,
        adminPhone: null,
        adminEmail: a.email,
        createdAt: a.createdAt,
        approvedAt: null,
        membersCount: a._count.members,
        studentsCount: a._count.students,
        tutorsCount: a._count.tutors,
      }))}
      currentUserId={dbUser.id}
      pendingCount={pendingCount}
    />
  );
}
