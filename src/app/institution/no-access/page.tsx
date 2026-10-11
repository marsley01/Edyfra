import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { NoAccessSignOut } from "./sign-out";

export const metadata = { title: "No school linked" };

/**
 * Where a signed-in account lands when it isn't an admin of any school.
 * Previously such accounts were sent back to the login page, which sends
 * signed-in users to the dashboard, which sent them back to login: an
 * endless redirect with no explanation.
 */
export default async function InstitutionNoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/institution-login");
  const { reason } = await searchParams;
  const isStaffRole = reason === "role";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1120] p-4">
      <div className="w-full max-w-md rounded-xl border border-white/[0.06] bg-white/[0.04] p-8 text-center shadow-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
          <Building2 className="h-6 w-6 text-emerald-400" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-white">
          {isStaffRole ? "Admins only" : "This account isn't linked to a school"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          {isStaffRole
            ? "The institution dashboard is for school admins. Ask your school admin for access."
            : `You're signed in as ${user.email}. If your school hasn't joined Edyfra yet, apply below. If it has, sign in with the email your school admin invited.`}
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          {!isStaffRole && (
            <Link
              href="/institution/apply"
              className="flex h-10 items-center justify-center rounded-lg bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400"
            >
              Apply for your school
            </Link>
          )}
          <NoAccessSignOut />
          <Link href="/dashboard" className="pt-1 text-xs text-white/40 hover:text-white/70">
            Go to my student dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
