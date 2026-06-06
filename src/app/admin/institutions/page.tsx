import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Role } from "@/generated/client";
import { listInstitutionApplications } from "@/app/actions/institution-founder";
import { InstitutionsReviewClient } from "./institutions-client";

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

  const applications = await listInstitutionApplications();
  const mapped = applications.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    schoolType: a.schoolType,
    curriculum: a.curriculum,
    county: a.county,
    subCounty: a.subCounty,
    status: a.status,
    email: a.email,
    adminName: a.adminName,
    createdAt: a.createdAt,
  }));
  return <InstitutionsReviewClient initialApplications={mapped} currentUserId={dbUser.id} />;
}
