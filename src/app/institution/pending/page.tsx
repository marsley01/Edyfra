import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Clock4, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";

export const metadata = { title: "Application under review — Edyfra Institutions" };

export default async function InstitutionPendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/institution/login");
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/institution/login");

  const member = await prisma.institutionMember.findFirst({
    where: { userId: dbUser.id },
    include: { institution: true },
    orderBy: { createdAt: "desc" },
  });
  if (!member) redirect("/institution/login");

  // If already approved, bounce into the dashboard
  if (member.institution.status === "ACTIVE") {
    redirect("/institution/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50/40 py-16">
      <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50/60 to-white p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Clock4 className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-black text-gray-900">Application under review</h1>
        <p className="mt-2 text-sm text-gray-600">
          Hi {dbUser.name}, the Edyfra team is reviewing the application for{" "}
          <strong>{member.institution.name}</strong>. You will get an email as soon as we are done.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Step icon={Mail} title="Email confirmation" sub="Already sent" />
          <Step icon={ShieldCheck} title="Founder review" sub="Within 24 hours" />
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="mailto:hello@edyfra.com"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Contact support
          </a>
          <LinkButton href="/institution" variant="ghost">
            Back to home
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

function Step({ icon: Icon, title, sub }: { icon: React.ComponentType<{ className?: string }>; title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-xs font-black uppercase tracking-widest text-gray-500">{title}</p>
      <p className="text-sm font-bold text-gray-900">{sub}</p>
    </div>
  );
}
