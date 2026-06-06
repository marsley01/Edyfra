import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
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

  return (
    <DashboardProviders>
      <div className="flex flex-col lg:flex-row min-h-screen bg-background">
        <MobileNav user={user} />
        <DashboardSidebar user={user} />
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>
        <MatchNotification />
      </div>
    </DashboardProviders>
  );
}
