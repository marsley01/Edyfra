import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Role } from "@/generated/client";
import { listInstitutionApplications } from "@/app/actions/institution-founder";
import { InstitutionsReviewClient } from "./institutions-client";

export const revalidate = 0;

export default async function AdminInstitutionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || (dbUser.role !== Role.FOUNDER && dbUser.role !== Role.ADMIN)) {
    redirect("/dashboard");
  }

  const applications = await listInstitutionApplications("ALL");
  const pendingCount = applications.filter((a) => a.status === "PENDING").length;

  return (
    <InstitutionsReviewClient
      initialApplications={applications.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        schoolType: a.schoolType ?? null,
        curriculum: a.curriculum ?? null,
        county: a.county,
        subCounty: a.subCounty,
        studentCount: a.studentCount,
        planTier: a.planTier ?? null,
        status: a.status,
        email: a.email,
        adminName: a.adminName,
        adminTitle: a.adminTitle ?? null,
        adminPhone: a.adminPhone,
        adminEmail: a.adminEmail,
        createdAt: a.createdAt,
        approvedAt: a.approvedAt,
        membersCount: a._count.members,
        studentsCount: a._count.students,
        tutorsCount: a._count.tutors,
      }))}
      currentUserId={dbUser.id}
      pendingCount={pendingCount}
    />
  );
}
