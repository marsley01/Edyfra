import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { TutorSidebar } from "@/components/dashboard/TutorSidebar";
import { TutorMobileNav } from "@/components/dashboard/TutorMobileNav";
import { ThemeToggle } from "@/components/theme-toggle";
import { TutorVideoShell } from "./TutorVideoShell";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = (user.user_metadata?.role || "").toUpperCase();
  if (role !== "TUTOR" && role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <TutorVideoShell>
      <div className="flex flex-col lg:flex-row min-h-screen bg-background">
        <TutorMobileNav user={user} />

        {/* Desktop sidebar */}
        <TutorSidebar user={user} />

        <main className="flex-1 overflow-y-auto pb-32">
          {/* Desktop top bar */}
          <header className="hidden lg:flex h-16 bg-background/80 backdrop-blur-xl border-b border-border px-8 items-center sticky top-0 z-30">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mr-auto">
              Tutor Dashboard
            </span>
            <ThemeToggle />
          </header>

          <div className="p-2 lg:p-6 max-w-6xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </TutorVideoShell>
  );
}
