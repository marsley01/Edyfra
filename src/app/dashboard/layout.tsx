import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import DashboardSidebar from "@/components/dashboard/Sidebar";
import MatchNotification from "@/components/dashboard/MatchNotification";
import MobileNav from "@/components/dashboard/MobileNav";
import DashboardProviders from "./DashboardProviders";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { institutionMembers: true },
  });

  const isInstitutionStaff = dbUser?.institutionMembers?.some(
    (m) =>
      ["INSTITUTION_ADMIN", "INSTITUTION_DEPUTY", "INSTITUTION_TEACHER"].includes(m.role) &&
      m.status === "ACTIVE"
  );

  if (isInstitutionStaff && dbUser?.role === "STUDENT") {
    redirect("/institution/dashboard");
  }

  return (
    <DashboardProviders>
      <div className="flex flex-col lg:flex-row min-h-screen bg-background">
        <MobileNav user={user} />
        <DashboardSidebar user={user} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
        <MatchNotification />
      </div>
    </DashboardProviders>
  );
}
